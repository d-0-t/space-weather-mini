import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import ReadMoreIcon from "@mui/icons-material/ReadMore";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import Rotate90DegreesCwIcon from "@mui/icons-material/Rotate90DegreesCw";

import HelpPopover from "../../../../HelpPopover/HelpPopover";
import FullSizeModal from "../../../../FullSizeModal";

import {
  auroraBand,
  isBoundaryRow,
  type AuroraBand,
  type OvationProduct,
} from "../../../../../products/ovation";
import {
  loadColorBlindMode,
  saveColorBlindMode,
} from "../../../../../products/color-blind";
import { useOvationQuery } from "./useOvationQuery";
import {
  type LandRing,
  fetchWorldLand,
} from "../../../../../products/world-land";
import { formatShort } from "../../../../../products/display-time";
import { useDisplayTimezone } from "../../../../DisplayTimezone/DisplayTimezoneContext";
import {
  COULDNT_LOAD_COPY,
  StaleDataNotice,
  liveDataState,
  useIsOffline,
} from "../offline/offline";

import "./OvalGlow.scss";

/** Hemisphere split for the on-demand glow table; `north` is lat > 0. */
export type OvalHemisphere = "north" | "south";

/**
 * Glow levels, dimmest first. The levels name local brightness per 1-degree
 * cell – deliberately no numbers: the same core brightness occurs at any Kp
 * (an ordinary oval still peaks at Aurora 31, live 2026-09-06), so numeric
 * ranges read as storm strength. The parser thresholds stay numeric
 * internally for the
 * view-distance band (ticket 05); only the presentation drops them.
 */
export const OVAL_LEVELS: Array<{
  level: Exclude<AuroraBand, "none">;
  label: string;
}> = [
  { level: "faint", label: "Faint" },
  { level: "moderate", label: "Moderate" },
  { level: "strong", label: "Strong" },
  { level: "intense", label: "Intense" },
];

/** One ramp stop: legend position in percent, the Aurora value the color
 * anchors to (the LUT interpolates on this), and the color [r, g, b, a-0..1]. */
export interface RampStop {
  pos: number;
  value: number;
  color: [number, number, number, number];
}

/**
 * Continuous glow color ramp, five hues in intensity order: transparent ->
 * green -> yellow -> orange -> red -> bright magenta, with `pos` placing
 * each stop on the legend bar and `value` anchoring it to the Aurora scale
 * (the canvas LUT interpolates on `value`, values past 100 clamp to the
 * magenta end).
 *
 * Anchors follow NOAA's own legend, which ticks this same 0-100 Aurora
 * value at 10% / 50% / 90% across a green-to-red bar: green carries the
 * whole ordinary range (1-30), yellow anchors at 45, orange at 60, red at
 * 75 and magenta at 100 are reserved for genuine extremes. The earlier
 * ramp started yellow at 16 (calibrated off single-day samples: ADR-0006
 * recorded "max 25 quiet", the 09-04 bands "max 14"), which painted
 * ordinary-night cores orange while NOAA's render of the same grid stayed
 * all-green (live 2026-09-06: grid max 31, 2,465 of 19,831 painted cells
 * >= 16). Interpolation now stays smooth through the old 15->16 hue/alpha
 * cliff. Alphas were softened the same day per user pick to sit closer to
 * NOAA's render, which fades low values hard toward transparent: the green
 * span runs 0.25 -> 0.75 and reaches full opacity only at the value-30
 * anchor, so faint and moderate cells read faint on quiet maps. Band
 * thresholds stay untouched for the on-demand glow table, the
 * view-distance band and color-blind mode.
 */
export const OVAL_RAMP_STOPS: RampStop[] = [
  { pos: 0, value: 0, color: [0, 0, 0, 0] },
  { pos: 15, value: 3, color: [0, 90, 55, 0.25] },
  { pos: 32, value: 8, color: [0, 150, 80, 0.5] },
  { pos: 48, value: 15, color: [30, 185, 90, 0.75] },
  { pos: 62, value: 30, color: [70, 205, 90, 1] },
  { pos: 72, value: 45, color: [255, 215, 0, 1] },
  { pos: 82, value: 60, color: [255, 140, 0, 1] },
  { pos: 92, value: 75, color: [255, 45, 0, 1] },
  { pos: 100, value: 100, color: [255, 90, 245, 1] },
];

/** Which paint ramp the map uses: the hue ramp, or Color-blind's
 * brightness-only ramp (ticket 06). */
export type RampMode = "default" | "color-blind";

/**
 * Color-blind ramp (ticket 06, shipped 2026-09-06; curve revised same day
 * per user pick): pure greyscale – no hue anywhere – so greyscale, every
 * color-vision type and night vision read the same map. Alpha climbs
 * monotonically along the same value anchors as the default ramp
 * (re-anchored with it) from a faint 0.1 at value 3 through 0.4, 0.6, 0.7,
 * 0.8 and 0.9, fully opaque white at value 75 where the default reaches
 * full-saturation red; the faint start (same-day user pick) keeps quiet
 * ovals dim like NOAA's faded render instead of pegging the ring near
 * white. The extreme tail
 * (75-100) then inverts white -> black so the rarest storm territory reads
 * as a dark eye inside the white ring – a cue too large to miss, at the
 * cost of brightness no longer mapping monotonically past 75 (channels stay
 * greyscale-neutral throughout, so nothing reads as a hue). The earlier
 * ramp saturated at value 32 (calibrated off stale single-day samples;
 * ordinary grids reach the low 30s), pegging ordinary-night cores at full
 * white, and its front-loaded alphas (0.55 at 8, 0.8 at 15) left too little
 * range between strong and intense – the readability complaint that drove
 * this curve. No hatch or contour is layered on top (they cannot survive a
 * blurred continuous gradient; dropped with user approval at the seam
 * review).
 */
export const OVAL_CB_RAMP_STOPS: RampStop[] = [
  { pos: 0, value: 0, color: [255, 255, 255, 0] },
  { pos: 15, value: 3, color: [255, 255, 255, 0.1] },
  { pos: 32, value: 8, color: [255, 255, 255, 0.4] },
  { pos: 48, value: 15, color: [255, 255, 255, 0.6] },
  { pos: 62, value: 30, color: [255, 255, 255, 0.7] },
  { pos: 72, value: 45, color: [255, 255, 255, 0.8] },
  { pos: 82, value: 60, color: [255, 255, 255, 0.9] },
  { pos: 92, value: 75, color: [255, 255, 255, 1] },
  { pos: 100, value: 100, color: [0, 0, 0, 1] },
];

/** Canvas size: 1px per 1-degree cell of the full OVATION grid (360 lon x
 * 181 lat, pole to pole). Painting at grid resolution with
 * `image-rendering: pixelated` keeps cell edges hard when the canvas scales
 * to panel width; the integer lon/lat -> px mapping has no float division,
 * so the seam bug the two-cap projection guarded against cannot recur. */
export const OVAL_CANVAS_WIDTH = 360;
export const OVAL_CANVAS_HEIGHT = 181;

/**
 * Maps one Aurora value to its ramp color [r, g, b, a-byte] through a
 * precomputed lookup table; alpha stops are stored scaled to 0-255 (the
 * demo's original bug rounded 0-1 floats straight into a Uint8Array, which
 * painted the whole ramp transparent). Values past the last stop clamp to
 * the ramp's end. One LUT per mode: the default hue ramp and Color-blind
 * mode's brightness ramp.
 */
function buildRampLut(stops: RampStop[]): Uint8Array {
  const lut = new Uint8Array(256 * 4);
  const last = stops[stops.length - 1];
  for (let value = 0; value < 256; value += 1) {
    let lo = stops[0];
    let hi = last;
    if (value >= last.value) {
      lo = last;
      hi = last;
    } else {
      for (let i = 0; i < stops.length - 1; i += 1) {
        if (value >= stops[i].value && value <= stops[i + 1].value) {
          lo = stops[i];
          hi = stops[i + 1];
          break;
        }
      }
    }
    const t =
      hi.value === lo.value ? 0 : (value - lo.value) / (hi.value - lo.value);
    for (let c = 0; c < 3; c += 1) {
      lut[value * 4 + c] = Math.round(
        lo.color[c] + (hi.color[c] - lo.color[c]) * t,
      );
    }
    lut[value * 4 + 3] = Math.round(
      (lo.color[3] + (hi.color[3] - lo.color[3]) * t) * 255,
    );
  }
  return lut;
}

/** One ramp definition per mode: the stops the legend bar renders and the
 * LUT the canvas paints through, gathered so the two can never drift. */
const RAMP_BY_MODE: Record<RampMode, { stops: RampStop[]; lut: Uint8Array }> = {
  default: { stops: OVAL_RAMP_STOPS, lut: buildRampLut(OVAL_RAMP_STOPS) },
  "color-blind": {
    stops: OVAL_CB_RAMP_STOPS,
    lut: buildRampLut(OVAL_CB_RAMP_STOPS),
  },
};

/** Ramp color for one Aurora value in the given mode: [r, g, b, a-byte]. */
export function rampColor(
  aurora: number,
  mode: RampMode = "default",
): [number, number, number, number] {
  const { lut } = RAMP_BY_MODE[mode];
  const o = Math.min(255, Math.max(0, Math.round(aurora))) * 4;
  return [lut[o], lut[o + 1], lut[o + 2], lut[o + 3]];
}

/** Legend bar background for the given mode: the mode's ramp as a CSS
 * gradient using each stop's `pos`, derived from the same stops the canvas
 * paints so legend and glow can never drift apart. */
export function ovalLegendGradientCss(mode: RampMode = "default"): string {
  return `linear-gradient(to right, ${RAMP_BY_MODE[mode].stops
    .map(
      (stop) =>
        `rgba(${stop.color[0]},${stop.color[1]},${stop.color[2]},${stop.color[3]}) ${stop.pos}%`,
    )
    .join(", ")})`;
}

/**
 * Max Aurora value the paint shows for one product: the maximum over the
 * painted set only (aurora >= 1, boundary rows clipped), so the legend
 * marker always matches what the map actually shows. `null` when nothing
 * paints, which hides the marker instead of pinning it to a corner.
 */
export function maxGlowValue(product: OvationProduct): number | null {
  let max: number | null = null;
  for (const cell of product.coordinates) {
    if (cell.aurora < 1) continue;
    if (isBoundaryRow(cell.latitude)) continue;
    if (max === null || cell.aurora > max) max = cell.aurora;
  }
  return max;
}

/**
 * Legend-bar percent position for one Aurora value in the given mode: the
 * same piecewise interpolation the canvas LUT paints through, walked over
 * the mode's stops (`pos`/`value` pairs), so the marker sits exactly where
 * the bar's own gradient places that value and cannot disagree with either
 * the legend or the glow. Values past the last stop clamp to 100 like the
 * paint does. Rounded to two decimals to keep the inline style stable.
 */
export function ovalLegendMarkerPos(
  value: number,
  mode: RampMode = "default",
): number {
  const stops = RAMP_BY_MODE[mode].stops;
  const last = stops[stops.length - 1];
  let lo = stops[0];
  let hi = last;
  if (value >= last.value) {
    lo = last;
  } else {
    for (let i = 0; i < stops.length - 1; i += 1) {
      if (value >= stops[i].value && value <= stops[i + 1].value) {
        lo = stops[i];
        hi = stops[i + 1];
        break;
      }
    }
  }
  const t =
    hi.value === lo.value ? 0 : (value - lo.value) / (hi.value - lo.value);
  const pos = lo.pos + (hi.pos - lo.pos) * t;
  return Math.round(pos * 100) / 100;
}

/**
 * Land fill for the basemap: #444444 on the rgb(1, 3, 11) deep-space stage,
 * re-confirmed per user pick 2026-09-06 - the oval must read at maximum
 * brightness, and a lighter land fill washed it out. A constant, not a
 * token: it is data-adjacent canvas paint like the ramp stops, and the
 * ui-palette contract governs SCSS.
 */
export const OVAL_LAND_FILL = "#444444";

/**
 * Projects one coastline ring into canvas pixels with ring-local longitude
 * unwrapping: consecutive points stay within 180 degrees of each other, so
 * a ring that crosses the antimeridian (Antarctica spans lon -180..180)
 * keeps running past x=360 instead of folding back across the map and
 * self-intersecting the evenodd fill. Pure so the geometry is testable -
 * this class of bug painted full-width lines at lat -17 and ate the
 * Antarctic bottom edge.
 */
export function projectRing(ring: LandRing): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  let previous = 0;
  let offset = 0;
  for (const [longitude, latitude] of ring) {
    let unwrapped = longitude + offset;
    while (unwrapped - previous > 180) {
      offset -= 360;
      unwrapped -= 360;
    }
    while (unwrapped - previous < -180) {
      offset += 360;
      unwrapped += 360;
    }
    previous = unwrapped;
    points.push([unwrapped + 180.5, 90 - latitude + 0.5]);
  }
  return points;
}

/**
 * Paints the Natural Earth land rings onto the basemap canvas. Each ring is
 * unwrapped by `projectRing` and painted at three horizontal offsets, so a
 * ring that runs off one map edge continues in from the other - the canvas
 * clips the rest. A ring spanning more than 180 degrees of unwrapped
 * longitude (Antarctica, at 360) cannot close contiguously, so its closure
 * runs out to the nearer polar edge instead of folding back across the map
 * and self-intersecting the evenodd fill. Runs once per land-data load;
 * silently keeps the last frame when headless.
 */
function paintLand(
  canvas: HTMLCanvasElement | null,
  rings: LandRing[] | null,
): void {
  if (!canvas || !rings) return;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, OVAL_CANVAS_WIDTH, OVAL_CANVAS_HEIGHT);
  context.fillStyle = OVAL_LAND_FILL;
  for (const dx of [-360, 0, 360]) {
    context.save();
    context.translate(dx, 0);
    context.beginPath();
    for (const ring of rings) {
      const points = projectRing(ring);
      const first = points[0];
      const last = points[points.length - 1];
      const averageY =
        points.reduce((sum, [, y]) => sum + y, 0) / points.length;
      const seamJump = Math.abs(first[0] - last[0]) > 180;
      const polarEdgeY =
        averageY > OVAL_CANVAS_HEIGHT / 2 ? OVAL_CANVAS_HEIGHT + 400 : -400;
      points.forEach(([x, y], index) => {
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      if (seamJump) {
        context.lineTo(last[0], polarEdgeY);
        context.lineTo(first[0], polarEdgeY);
      }
      context.closePath();
    }
    context.fill("evenodd");
    context.restore();
  }
}

/**
 * Accessible name for the world glow canvas; lists the glow levels with no
 * numbers and states what transparent means, so color is never the only
 * encoding. A `<canvas>` is a void element and cannot contain the
 * `.sr-only` + `aria-labelledby` pattern the charts use – `aria-label` here
 * is the documented exception (`coding-standards.md:39`: acceptable where
 * text cannot work at all).
 */
export function ovalCanvasLabel(mode: RampMode = "default"): string {
  const levels = OVAL_LEVELS.map((entry) => entry.label.toLowerCase()).join(
    ", ",
  );
  const colorBlindNote =
    mode === "color-blind"
      ? " Color-blind on: the glow paints as greyscale brightness – dimmer means faint, brighter means stronger, and the rarest storm cores invert to black inside the white ring – so the map reads without color."
      : "";
  return `Oval glow intensity, world map from north pole to south pole. Glow levels, dimmest first: ${levels}. Transparent means no glow forecast.${colorBlindNote}`;
}

/**
 * Projects one Oval cell to canvas pixels: x=0 is the date line (matching
 * the GIBS tile edges), y=0 the north pole. Pure integer math, so every
 * grid column and row lands on its own pixel.
 */
export function ovalCellPoint(
  longitude: number,
  latitude: number,
): { x: number; y: number } {
  return {
    x: (((longitude + 180) % 360) + 360) % 360,
    y: 90 - latitude,
  };
}

/** Per-level cell counts for one hemisphere; the on-demand glow table's
 * source of truth. Boundary rows are excluded so the numbers match the
 * painted map. */
export function countGlowLevels(
  product: OvationProduct,
  hemisphere: OvalHemisphere,
): Record<"none" | Exclude<AuroraBand, "none">, number> {
  const counts: Record<"none" | Exclude<AuroraBand, "none">, number> = {
    none: 0,
    faint: 0,
    moderate: 0,
    strong: 0,
    intense: 0,
  };
  for (const cell of product.coordinates) {
    if (isBoundaryRow(cell.latitude)) continue;
    const north = cell.latitude > 0;
    if (hemisphere === "north" ? !north : north) continue;
    counts[auroraBand(cell.aurora)] += 1;
  }
  return counts;
}

/**
 * 3x3 box blur over the raw grid frame, NOAA-render style. The OVATION grid
 * carries sparse value-1 speckle near the poles and hard-edged full-width
 * diffuse rows that read as glitch bands when painted cell-raw; one blur
 * pass melts speckle into soft glow the way the official render does.
 * Pure so the softening is testable.
 */
export function blurGlowFrame(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      for (let c = 0; c < 4; c += 1) {
        let sum = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          const yy = y + dy;
          if (yy < 0 || yy >= height) continue;
          for (let dx = -1; dx <= 1; dx += 1) {
            const xx = x + dx;
            if (xx < 0 || xx >= width) continue;
            sum += data[(yy * width + xx) * 4 + c];
            n += 1;
          }
        }
        out[(y * width + x) * 4 + c] = Math.round(sum / n);
      }
    }
  }
  return out;
}

/** Paints the world grid in the given ramp mode; silently keeps the last
 * frame when headless. */
function paintGlow(
  canvas: HTMLCanvasElement | null,
  product: OvationProduct | null,
  mode: RampMode,
): void {
  if (!canvas || !product) return;
  const context = canvas.getContext("2d");
  if (!context) return;
  const frame = context.createImageData(OVAL_CANVAS_WIDTH, OVAL_CANVAS_HEIGHT);
  for (const cell of product.coordinates) {
    if (cell.aurora < 1) continue;
    if (isBoundaryRow(cell.latitude)) continue;
    const { x, y } = ovalCellPoint(cell.longitude, cell.latitude);
    if (x < 0 || x >= OVAL_CANVAS_WIDTH || y < 0 || y >= OVAL_CANVAS_HEIGHT) {
      continue;
    }
    const [r, g, b, a] = rampColor(cell.aurora, mode);
    const o = (y * OVAL_CANVAS_WIDTH + x) * 4;
    frame.data[o] = r;
    frame.data[o + 1] = g;
    frame.data[o + 2] = b;
    frame.data[o + 3] = a;
  }
  frame.data.set(
    blurGlowFrame(frame.data, OVAL_CANVAS_WIDTH, OVAL_CANVAS_HEIGHT),
  );
  context.putImageData(frame, 0, 0);
}

/**
 * One pole-to-pole world stage: the Natural Earth land basemap and the glow,
 * painted through the same projection from the same product and ramp mode.
 * Rendered twice – inline in the section and inside the full-size modal – so
 * each carries its own canvases and paint effects while the paint functions
 * stay shared: the two stages cannot drift. Mounting runs both paints (the
 * section only renders stages once the product exists), which keeps the old
 * `hasProduct` repaint discipline without the extra dependency.
 */
const OvalStage: React.FC<{
  product: OvationProduct | null;
  landData: LandRing[] | null;
  mode: RampMode;
  /** Extra stage class for the full-size variant's layout hooks. */
  className?: string;
}> = ({ product, landData, mode, className }) => {
  const landRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    paintLand(landRef.current, landData);
  }, [landData]);

  useEffect(() => {
    paintGlow(glowRef.current, product, mode);
  }, [product, mode]);

  return (
    <div
      className={
        className ? `oval-glow__stage ${className}` : "oval-glow__stage"
      }
    >
      {/* Decorative basemap: Natural Earth land through the same projection
          as the glow, so alignment holds by construction. */}
      <canvas
        ref={landRef}
        className="oval-glow__land"
        width={OVAL_CANVAS_WIDTH}
        height={OVAL_CANVAS_HEIGHT}
        aria-hidden="true"
      />
      <canvas
        ref={glowRef}
        className="oval-glow__canvas"
        width={OVAL_CANVAS_WIDTH}
        height={OVAL_CANVAS_HEIGHT}
        role="img"
        aria-label={ovalCanvasLabel(mode)}
      />
    </div>
  );
};

/**
 * The glow legend – gradient bar, the current-max marker and the level
 * labels – shared by the inline section and the full-size modal, so both
 * copies derive from the same stops and the same counts and cannot drift.
 */
const OvalLegend: React.FC<{
  counts: { max: number | null } | null;
  mode: RampMode;
}> = ({ counts, mode }) => (
  <div className="oval-glow__legend">
    <div
      className="oval-glow__legend__bar"
      style={{ background: ovalLegendGradientCss(mode) }}
      aria-hidden="true"
    >
      {/* "You are here" tick at tonight's max: positioned through the same
          stops the bar gradient and the canvas paint derive from, so it
          cannot disagree with either. Hidden when nothing paints
          (maxGlowValue returns null). Decoration like the bar itself - the
          glow intensity table stays the data alternative. */}
      {counts?.max != null && (
        <span
          className="oval-glow__legend__marker"
          style={{ left: `${ovalLegendMarkerPos(counts.max, mode)}%` }}
          title="Current maximum"
        />
      )}
    </div>
    <div className="oval-glow__legend__labels">
      {OVAL_LEVELS.map(({ level, label }) => (
        <span key={level} className="oval-glow__legend__label">
          {label}
        </span>
      ))}
    </div>
  </div>
);

/**
 * Oval glow intensity – the real OVATION 1-degree grid as one continuous
 * NASA-style glow ramp on a single pole-to-pole world canvas over a Natural
 * Earth land basemap painted with the same projection. Color wash only in
 * the default mode; Color-blind (ticket 06) swaps the ramp to pure
 * brightness via the toggle beside the legend.
 */
const OvalGlow: React.FC = () => {
  const offline = useIsOffline();
  const { displayTimezone } = useDisplayTimezone();
  // Full-size modal rotation: a manual toggle whose layout lives entirely in
  // a portrait media query, so a stale rotated state renders upright (and
  // the toggle hides) in landscape - no viewport listener needed.
  const [rotated, setRotated] = useState(false);

  // Color-blind is a per-user preference: read once on mount, written
  // on every toggle, versioned in localStorage (products/color-blind.ts).
  const [colorBlind, setColorBlind] = useState(() =>
    loadColorBlindMode(localStorage),
  );
  const mode: RampMode = colorBlind ? "color-blind" : "default";

  const ovalQuery = useOvationQuery();

  const state = liveDataState(ovalQuery, offline);
  const product = ovalQuery.data ?? null;

  const counts = useMemo(
    () =>
      product
        ? {
            north: countGlowLevels(product, "north"),
            south: countGlowLevels(product, "south"),
            max: maxGlowValue(product),
          }
        : null,
    [product],
  );

  const handleColorBlindChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const next = event.target.checked;
    // The write rides the change event, not the state updater: it is a side
    // effect, and React may invoke updaters more than once.
    saveColorBlindMode(localStorage, next);
    setColorBlind(next);
  };

  // The land query is static asset territory: fetched once, retried by the
  // offline discipline, never polled. A failed land fetch leaves the ocean
  // black under the glow - the forecast still reads.
  const landQuery = useQuery({
    queryKey: ["world-land", "static"],
    queryFn: fetchWorldLand,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });

  // The land asset usually resolves while OVATION is still pending, and the
  // stages are only mounted after that (inside the loaded section) - each
  // OvalStage's own land paint effect runs on its mount, so the basemap
  // cannot silently miss the data either way.
  const landData = landQuery.data ?? null;

  if (ovalQuery.isPending && !product) {
    return (
      <section className="oval-glow" aria-busy="true">
        <p>Loading oval glow…</p>
      </section>
    );
  }
  if (state === "never-loaded" || !product) {
    return (
      <section className="oval-glow">
        <p>{COULDNT_LOAD_COPY}</p>
      </section>
    );
  }

  return (
    <section className="oval-glow">
      <div className="oval-glow__head">
        <h3 className="oval-glow__title">Oval glow intensity</h3>
        <HelpPopover
          popoverClassName="oval-glow__popover"
          content={{
            label: "About this map",
            paragraphs: [
              "Cloud coverage, moon phase and light pollution affect visibility.",
              "Glow levels are local brightness per 1-degree cell – not the Kp storm scale.",
              "Dim green spreading beyond the bright ring is diffuse glow; transparent areas have no glow forecast.",
            ],
          }}
        />
      </div>
      <p className="oval-glow__fresh">
        Forecast Time {formatShort(product.forecastTime, displayTimezone)} –
        30–90 min lead.
      </p>
      {/* One controls row, space-between with wrap: the map's data
          alternative for everyone (no sr-only tables) on the left – a
          disclosure that stays closed until asked for, named by its visible
          text with the ReadMore icon as decoration – and the Color-blind
          checkbox pill on the right. */}
      <div className="oval-glow__controls">
        <details className="oval-glow__table-disclosure">
          <summary className="oval-glow__table-disclosure__summary">
            <ReadMoreIcon aria-hidden="true" fontSize="small" />
            <span>Glow intensity table</span>
          </summary>
          <table className="oval-glow__table">
            <caption>Oval glow levels by hemisphere</caption>
            <thead>
              <tr>
                <th scope="col">Glow level</th>
                <th scope="col">North cells</th>
                <th scope="col">South cells</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">None</th>
                <td>{counts?.north.none ?? 0}</td>
                <td>{counts?.south.none ?? 0}</td>
              </tr>
              {OVAL_LEVELS.map(({ level, label }) => (
                <tr key={level}>
                  <th scope="row">{label}</th>
                  <td>{counts?.north[level] ?? 0}</td>
                  <td>{counts?.south[level] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        {/* Color-blind (ticket 06): a checkbox pill like Compact view
            (checkbox rendered on the right), named by its visible label
            text; focus is Light Lime through the global button token. */}
        <label className="btn--secondary oval-glow__cb-toggle">
          <input
            type="checkbox"
            checked={colorBlind}
            onChange={handleColorBlindChange}
          />
          <span className="btn__label">Color-blind</span>
        </label>
      </div>
      {state === "stale" ? <StaleDataNotice /> : null}
      <figure className="oval-glow__cap">
        <figcaption className="oval-glow__cap__label sr-only">
          World map with the overlayed aurora rings.
        </figcaption>
        <OvalStage product={product} landData={landData} mode={mode} />
        {/* Full size (in-modal): the trigger covers the stage instead of
            wrapping it, so the glow canvas keeps its own accessible name and
            the button is named by the sr-only label alone - no name-from-
            content concatenation. The corner chip is the visible hint that
            the map opens bigger. */}
        <FullSizeModal
          label="Oval glow intensity, full size"
          triggerClassName="oval-glow__expand"
          trigger={
            <span className="oval-glow__expand__hint">
              <OpenInFullIcon aria-hidden="true" fontSize="small" />
            </span>
          }
        >
          {/* Map + legend, bigger. Rotation is a portrait-only affordance:
              the toggle and the rotated layout both live under one
              orientation media query, so in landscape the shared 90vw/80vh
              budget already fits the wide map upright and the toggle is
              simply not there. */}
          <div
            className={
              rotated
                ? "oval-glow__modal oval-glow__modal--rotated"
                : "oval-glow__modal"
            }
          >
            <button
              type="button"
              className="btn--secondary oval-glow__modal__rotate"
              aria-pressed={rotated}
              onClick={() => setRotated((current) => !current)}
            >
              <Rotate90DegreesCwIcon aria-hidden="true" fontSize="small" />
              <span className="btn__label">Rotate map</span>
            </button>
            <div className="oval-glow__modal__frame">
              <OvalStage
                product={product}
                landData={landData}
                mode={mode}
                className="oval-glow__stage--modal"
              />
            </div>
            <OvalLegend counts={counts} mode={mode} />
          </div>
        </FullSizeModal>
      </figure>
      <OvalLegend counts={counts} mode={mode} />
    </section>
  );
};

export default OvalGlow;
