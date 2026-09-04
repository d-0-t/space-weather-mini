import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import InfoIcon from "@mui/icons-material/Info";

import {
  OVATION_QUERY_KEY,
  OVATION_REFETCH_IN_BACKGROUND,
  OVATION_REFETCH_INTERVAL_MS,
  OVATION_STALE_TIME_MS,
  OVATION_URL,
  auroraBand,
  parseOvation,
  type AuroraBand,
  type OvationProduct,
} from "../../../../../products/ovation";
import {
  WORLD_LAND_URL,
  type LandRing,
  fetchWorldLand,
} from "../../../../../products/world-land";
import {
  formatAge,
  formatUtcShort,
} from "../../../../../products/live-helpers";
import {
  COULDNT_LOAD_COPY,
  StaleDataNotice,
  liveDataState,
  useIsOffline,
} from "../offline/offline";

import "./OvalGlow.scss";

/** Hemisphere split for the hidden counts table; `north` is lat > 0. */
export type OvalHemisphere = "north" | "south";

/** Fetches the live Oval grid; mocked at the URL boundary in tests. */
export async function fetchOvation(): Promise<OvationProduct> {
  const response = await fetch(OVATION_URL);
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return parseOvation(await response.text());
}

/**
 * Glow levels, dimmest first. The levels name local brightness per 1-degree
 * cell – deliberately no numbers: the same core brightness occurs at any Kp
 * (a quiet-day oval still peaks at Aurora 12), so numeric ranges read as
 * storm strength. The parser thresholds stay numeric internally for the
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

/**
 * Continuous glow color ramp, five hues in band order: transparent -> green
 * -> yellow -> red -> bright magenta, with `pos` placing each stop on the
 * legend bar and `value` anchoring it to the Aurora scale (the canvas LUT
 * interpolates on `value`, values past 100 clamp to the magenta end).
 *
 * Hue boundaries follow intensity, not just band order: green carries the
 * whole ordinary range (faint 1-5, moderate 6-10, strong 11-15), yellow
 * starts at 16 where the intense band and storm territory begin, and red
 * and magenta are reserved for genuine extremes. NOAA's own oval product
 * renders ordinary activity in green shades, so quiet maps read the same
 * way here instead of showing storm-red on a Kp-0 night. The legend keeps
 * roughly even hue stretches so no single color dominates the bar. Band
 * thresholds stay untouched for the hidden table, the view-distance band
 * and color-blind mode.
 */
export const OVAL_RAMP_STOPS: Array<{
  /** Legend bar position in percent. */
  pos: number;
  /** Aurora value the color anchors to; the LUT interpolates on this. */
  value: number;
  color: [number, number, number, number];
}> = [
  { pos: 0, value: 0, color: [0, 0, 0, 0] },
  { pos: 15, value: 3, color: [0, 90, 55, 0.42] },
  { pos: 32, value: 8, color: [0, 150, 80, 0.72] },
  { pos: 52, value: 15, color: [30, 185, 90, 0.88] },
  { pos: 58, value: 16, color: [255, 215, 0, 1] },
  { pos: 70, value: 24, color: [255, 140, 0, 1] },
  { pos: 82, value: 45, color: [255, 45, 0, 1] },
  { pos: 92, value: 70, color: [255, 0, 160, 1] },
  { pos: 100, value: 100, color: [255, 90, 245, 1] },
];

/** Canvas size: 1px per 1-degree cell of the full OVATION grid (360 lon x
 * 181 lat, pole to pole). Painting at grid resolution with
 * `image-rendering: pixelated` keeps cell edges hard when the canvas scales
 * to panel width; the integer lon/lat -> px mapping has no float division,
 * so the seam bug the two-cap projection guarded against cannot recur. */
export const OVAL_CANVAS_WIDTH = 360;
export const OVAL_CANVAS_HEIGHT = 181;

/**
 * Grid-edge rows the OVATION model fills with a nonzero floor: isolated
 * 1-degree rings at the equator (lat 0 and -1, surrounded by all-zero lat 1
 * and -2) and the south pole point (lat -90, next to an all-zero -89;
 * verified live 2026-09-04). No physical aurora reaches the geographic
 * equator or the pole point, and equirectangular projection smears each row
 * across the full map width, so painting them draws phantom lines NOAA's own
 * render never shows. Clipped from both the paint and the counts table.
 */
export function isBoundaryRow(latitude: number): boolean {
  return (
    latitude === 0 || latitude === -1 || latitude === 90 || latitude === -90
  );
}

/**
 * Maps one Aurora value to its ramp color [r, g, b, a-byte] through a
 * precomputed lookup table; alpha stops are stored scaled to 0-255 (the
 * demo's original bug rounded 0-1 floats straight into a Uint8Array, which
 * painted the whole ramp transparent). Values past the last stop clamp to
 * the magenta end.
 */
const RAMP_LUT = (() => {
  const lut = new Uint8Array(256 * 4);
  const stops = OVAL_RAMP_STOPS;
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
})();

/** Ramp color for one Aurora value: [r, g, b, a-byte]. */
export function rampColor(aurora: number): [number, number, number, number] {
  const o = Math.min(255, Math.max(0, Math.round(aurora))) * 4;
  return [RAMP_LUT[o], RAMP_LUT[o + 1], RAMP_LUT[o + 2], RAMP_LUT[o + 3]];
}

/** Legend bar background: the ramp as a CSS gradient using each stop's
 * `pos`, derived from the same stops the canvas paints so legend and glow
 * can never drift apart. */
export function ovalLegendGradientCss(): string {
  return `linear-gradient(to right, ${OVAL_RAMP_STOPS.map(
    (stop) =>
      `rgba(${stop.color[0]},${stop.color[1]},${stop.color[2]},${stop.color[3]}) ${stop.pos}%`,
  ).join(", ")})`;
}

/**
 * Land fill for the basemap: #444444 on the black ocean per user pick -
 * 3.66:1 against black (the previous deep-indigo fill measured 1.36:1).
 * A constant, not a token - it is data-adjacent canvas paint like the ramp
 * stops, and the ui-palette contract governs SCSS.
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
export function ovalCanvasLabel(): string {
  const levels = OVAL_LEVELS.map((entry) => entry.label.toLowerCase()).join(
    ", ",
  );
  return `Oval glow intensity, world map from north pole to south pole. Glow levels, dimmest first: ${levels}. Transparent means no glow forecast.`;
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

/** Per-level cell counts for one hemisphere; the hidden table's source of
 * truth. Boundary rows are excluded so the numbers match the painted map. */
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

/** Paints the world grid; silently keeps the last frame when headless. */
function paintGlow(
  canvas: HTMLCanvasElement | null,
  product: OvationProduct | null,
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
    const [r, g, b, a] = rampColor(cell.aurora);
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
 * Oval glow intensity – the real OVATION 1-degree grid as one continuous
 * NASA-style glow ramp on a single pole-to-pole world canvas over a Natural
 * Earth land basemap painted with the same projection. Color wash only (no
 * hatch; hatch arrives with color-blind mode in ticket 06).
 */
const OvalGlow: React.FC = () => {
  const offline = useIsOffline();
  const [infoOpen, setInfoOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landCanvasRef = useRef<HTMLCanvasElement>(null);
  const infoRef = useRef<HTMLDetailsElement>(null);

  const ovalQuery = useQuery({
    queryKey: [...OVATION_QUERY_KEY],
    queryFn: fetchOvation,
    refetchInterval: OVATION_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: OVATION_REFETCH_IN_BACKGROUND,
    staleTime: OVATION_STALE_TIME_MS,
    gcTime: 10 * 60 * 1000,
  });

  // The info popover follows the ChartHelp discipline: Escape closes it and
  // returns focus, a primary click elsewhere closes it.
  useEffect(() => {
    const el = infoRef.current;
    if (!el) return;
    const onPointerDown = (event: PointerEvent): void => {
      if (event.button !== 0) return;
      if (infoOpen && !el.contains(event.target as Node)) setInfoOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [infoOpen]);

  const state = liveDataState(ovalQuery, offline);
  const product = ovalQuery.data ?? null;

  const counts = useMemo(
    () =>
      product
        ? {
            north: countGlowLevels(product, "north"),
            south: countGlowLevels(product, "south"),
          }
        : null,
    [product],
  );

  useEffect(() => {
    paintGlow(canvasRef.current, product);
  }, [product]);

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
  // early-return phase keeps the canvases unmounted until then - so the
  // paint also re-runs once the section actually mounts (`hasProduct`),
  // or the land would silently never paint.
  const landData = landQuery.data ?? null;
  const hasProduct = product !== null;
  useEffect(() => {
    paintLand(landCanvasRef.current, landData);
  }, [landData, hasProduct]);

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

  const closeInfoOnEscape: React.KeyboardEventHandler<HTMLElement> = (
    event,
  ) => {
    if (event.key === "Escape" && infoOpen) {
      event.preventDefault();
      setInfoOpen(false);
      infoRef.current?.querySelector("summary")?.focus();
    }
  };

  return (
    <section className="oval-glow">
      <div className="oval-glow__head">
        <h3 className="oval-glow__title">Oval glow intensity</h3>
        <details
          className="oval-glow__info"
          ref={infoRef}
          open={infoOpen}
          onKeyDown={closeInfoOnEscape}
        >
          <summary
            className="btn--icon"
            title="About this map"
            role="button"
            aria-expanded={infoOpen}
            onClick={(event) => {
              // Drive the popover from state so jsdom and browsers agree;
              // suppress the native toggle to avoid double-flipping.
              event.preventDefault();
              setInfoOpen((open) => !open);
            }}
          >
            <span aria-hidden="true">
              <InfoIcon fontSize="small" />
            </span>
            <span className="sr-only">About this map</span>
          </summary>
          <div className="oval-glow__popover">
            <p>
              Cloud coverage, moon phase and light pollution affect visibility.
            </p>
            <p>
              Glow levels are local brightness per 1-degree cell – not the Kp
              storm scale.
            </p>
            <p>
              Dim green spreading beyond the bright ring is diffuse glow;
              transparent areas have no glow forecast.
            </p>
          </div>
        </details>
      </div>
      <p className="oval-glow__fresh">
        Forecast Time {formatUtcShort(product.forecastTime)} – 30–90 min lead.
        {/* Updated {formatAge(product.observationTime)}. */}
      </p>
      {state === "stale" ? <StaleDataNotice /> : null}
      <figure className="oval-glow__cap">
        <figcaption className="oval-glow__cap__label sr-only">
          World map with the overlayed aurora rings.
        </figcaption>
        <div className="oval-glow__stage">
          {/* Decorative basemap: Natural Earth land through the same
              projection as the glow, so alignment holds by construction. */}
          <canvas
            ref={landCanvasRef}
            className="oval-glow__land"
            width={OVAL_CANVAS_WIDTH}
            height={OVAL_CANVAS_HEIGHT}
            aria-hidden="true"
          />
          <canvas
            ref={canvasRef}
            className="oval-glow__canvas"
            width={OVAL_CANVAS_WIDTH}
            height={OVAL_CANVAS_HEIGHT}
            role="img"
            aria-label={ovalCanvasLabel()}
          />
        </div>
      </figure>
      <div className="oval-glow__legend">
        <div
          className="oval-glow__legend__bar"
          style={{ background: ovalLegendGradientCss() }}
          aria-hidden="true"
        />
        <div className="oval-glow__legend__labels">
          {OVAL_LEVELS.map(({ level, label }) => (
            <span key={level} className="oval-glow__legend__label">
              {label}
            </span>
          ))}
        </div>
      </div>
      <table className="oval-glow__table sr-only">
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
    </section>
  );
};

export default OvalGlow;
