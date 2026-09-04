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

/** Polar cap painted by one Oval glow canvas; both caps render at once. */
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
 * Frozen Kp presentation classes reused for the glow swatches.
 * The `.kp01-.kp9` classes are the frozen data-token mechanism (Tables.scss);
 * the glow reuses four of them so the legend adds no new colors. Gray
 * `None` is the absence indicator (`--color-gray` token, OvalGlow.scss).
 */
export const OVAL_LEVEL_KP_CLASS: Record<
  Exclude<AuroraBand, "none">,
  string
> = {
  faint: "kp34",
  moderate: "kp45",
  strong: "kp67",
  intense: "kp89",
};

/**
 * Canvas fill colors for the glow levels. These are the exact `rgb()` values
 * of the frozen Kp classes above (`Tables.scss:66-84` byte-identical
 * contract); a `<canvas>` fillStyle cannot reference a CSS class or
 * `color-mix`, so the data colors are reused here verbatim. The `.scss`
 * contract test only scans stylesheets, and these are data encoding (the
 * Oval forecast), not UI chrome – no new hex or palette is introduced.
 */
export const OVAL_LEVEL_FILL: Record<Exclude<AuroraBand, "none">, string> = {
  faint: "rgb(0, 128, 89)",
  moderate: "rgb(37, 187, 0)",
  strong: "rgb(255, 166, 0)",
  intense: "rgb(245, 0, 0)",
};

/**
 * Canvas size per polar cap: 1px per 1-degree grid cell (360 lon × 91 lat,
 * equator included in both caps – it carries no glow either way). Painting
 * at grid resolution with `image-rendering: pixelated` keeps cell edges hard
 * when the canvas scales to panel width; painting at 2× and downscaling
 * blurred transparent gaps into the cells as dark seams.
 */
export const OVAL_CANVAS_WIDTH = 360;
export const OVAL_CANVAS_HEIGHT = 91;

/**
 * Stadia `alidade_smooth_dark` tiles behind the canvas, locked to world
 * zoom 1 (2 tiles per cap, 4 total) so tile cost stays near zero. The key
 * comes from `VITE_STADIA_API_KEY` (local `.env`, never committed; deploy
 * env on Netlify) – restrict it to the app domain in the Stadia console so
 * the exposed key cannot be reused elsewhere. Tile responses are `CacheFirst`
 * 7 days via the `stadia` runtime route, so the key is sent rarely.
 * Horizontal wrap is handled by normalizing longitude in `projectOvalCell`;
 * no geocoding or routing is ever requested from the map.
 */
export function ovalTileUrls(
  hemisphere: OvalHemisphere,
  apiKey: string,
): string[] {
  const key = encodeURIComponent(apiKey);
  const tile = (x: number, y: number): string =>
    `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/1/${x}/${y}.png?api_key=${key}`;
  return hemisphere === "north"
    ? [tile(0, 0), tile(1, 0)]
    : [tile(0, 1), tile(1, 1)];
}

/**
 * Accessible name for one cap canvas; lists the glow levels with no numbers
 * and states the gray meaning, so color is never the only encoding. A
 * `<canvas>` is a void element and cannot contain the `.sr-only` +
 * `aria-labelledby` pattern the charts use – `aria-label` here is the
 * documented exception (`coding-standards.md:39`: acceptable where text
 * cannot work at all).
 */
export function ovalCanvasLabel(hemisphere: OvalHemisphere): string {
  const side = hemisphere === "north" ? "northern" : "southern";
  const levels = OVAL_LEVELS.map((entry) => entry.label.toLowerCase()).join(
    ", ",
  );
  return `Oval glow intensity, ${side} hemisphere. Glow levels, dimmest first: ${levels}. Gray means no glow forecast.`;
}

/** True when a latitude belongs to the painted cap (equator in both). */
export function cellInHemisphere(
  latitude: number,
  hemisphere: OvalHemisphere,
): boolean {
  return hemisphere === "north" ? latitude >= 0 : latitude <= 0;
}

/**
 * Projects one Oval cell to canvas pixels for the painted cap. The grid is
 * integer degrees on a 1px-per-cell canvas, so the mapping rounds to the
 * nearest pixel and clamps – never `Math.floor` on float division, which
 * dropped 20 columns (lon 5, 16, 27, …) to true 1px gaps that scaling up
 * only widens.
 */
export function projectOvalCell(
  longitude: number,
  latitude: number,
  hemisphere: OvalHemisphere,
): { x: number; y: number } | null {
  if (!cellInHemisphere(latitude, hemisphere)) return null;
  const wrapped = (((longitude + 180) % 360) + 360) % 360;
  const clamp = (value: number, max: number): number =>
    Math.min(max, Math.max(0, Math.round(value)));
  const x = clamp((wrapped / 360) * OVAL_CANVAS_WIDTH, OVAL_CANVAS_WIDTH - 1);
  const y =
    hemisphere === "north"
      ? clamp(
          ((90 - latitude) / 90) * (OVAL_CANVAS_HEIGHT - 1),
          OVAL_CANVAS_HEIGHT - 1,
        )
      : clamp(
          ((0 - latitude) / 90) * (OVAL_CANVAS_HEIGHT - 1),
          OVAL_CANVAS_HEIGHT - 1,
        );
  return { x, y };
}

/** Per-level cell counts for one cap; the hidden table's source of truth. */
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
    if (!cellInHemisphere(cell.latitude, hemisphere)) continue;
    counts[auroraBand(cell.aurora)] += 1;
  }
  return counts;
}

/** Paints one cap's grid; silently keeps the last frame when headless. */
function paintGlow(
  canvas: HTMLCanvasElement | null,
  product: OvationProduct | null,
  hemisphere: OvalHemisphere,
): void {
  if (!canvas || !product) return;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, OVAL_CANVAS_WIDTH, OVAL_CANVAS_HEIGHT);
  for (const cell of product.coordinates) {
    if (cell.aurora < 1) continue;
    const point = projectOvalCell(cell.longitude, cell.latitude, hemisphere);
    if (!point) continue;
    const band = auroraBand(cell.aurora);
    if (band === "none") continue;
    context.fillStyle = OVAL_LEVEL_FILL[band];
    context.fillRect(point.x, point.y, 1, 1);
  }
}

/**
 * Oval glow intensity – both polar caps of the real OVATION 1-degree grid on
 * `<canvas>` over a few keyless dark tiles. Color wash only (no hatch;
 * hatch arrives with color-blind mode in ticket 06).
 */
const OvalGlow: React.FC = () => {
  const offline = useIsOffline();
  const [infoOpen, setInfoOpen] = useState(false);
  const northRef = useRef<HTMLCanvasElement>(null);
  const southRef = useRef<HTMLCanvasElement>(null);
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
    paintGlow(northRef.current, product, "north");
    paintGlow(southRef.current, product, "south");
  }, [product]);

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

  // Stadia key from the build env (local `.env`, deploy env on Netlify).
  // Without it the tile layer is omitted and the glow paints on black.
  const stadiaKey = import.meta.env.VITE_STADIA_API_KEY?.trim() ?? "";

  const renderCap = (
    hemisphere: OvalHemisphere,
    caption: string,
    ref: React.RefObject<HTMLCanvasElement | null>,
  ): React.ReactNode => (
    <figure className="oval-glow__cap">
      <figcaption className="oval-glow__cap__label">{caption}</figcaption>
      <div className="oval-glow__stage">
        {stadiaKey ? (
          <div className="oval-glow__tiles" aria-hidden="true">
            {ovalTileUrls(hemisphere, stadiaKey).map((src) => (
              <img
                key={src}
                className="oval-glow__tile"
                src={src}
                alt=""
                loading="lazy"
              />
            ))}
          </div>
        ) : null}
        <canvas
          ref={ref}
          className="oval-glow__canvas"
          width={OVAL_CANVAS_WIDTH}
          height={OVAL_CANVAS_HEIGHT}
          role="img"
          aria-label={ovalCanvasLabel(hemisphere)}
        />
      </div>
    </figure>
  );

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
          </div>
        </details>
      </div>
      <p className="oval-glow__fresh">
        Forecast Time {formatUtcShort(product.forecastTime)} – 30–90 min lead.
        {/* Updated: {formatAge(product.observationTime)}. */}
      </p>
      {state === "stale" ? <StaleDataNotice /> : null}
      {renderCap("north", "Northern hemisphere", northRef)}
      {renderCap("south", "Southern hemisphere", southRef)}
      <ul className="oval-glow__legend">
        <li className="oval-glow__legend__item">
          <span
            className="oval-glow__swatch oval-glow__swatch--none"
            aria-hidden="true"
          />
          <span className="oval-glow__legend__text">None</span>
        </li>
        {OVAL_LEVELS.map(({ level, label }) => (
          <li key={level} className="oval-glow__legend__item">
            <span
              className={`oval-glow__swatch ${OVAL_LEVEL_KP_CLASS[level]}`}
              aria-hidden="true"
            />
            <span className="oval-glow__legend__text">{label}</span>
          </li>
        ))}
      </ul>
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
