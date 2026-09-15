import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import ReadMoreIcon from "@mui/icons-material/ReadMore";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import Rotate90DegreesCwIcon from "@mui/icons-material/Rotate90DegreesCw";

import HelpPopover from "../../../../HelpPopover/HelpPopover";
import FullSizeModal from "../../../../FullSizeModal";
import CollapsiblePanel from "../../../../CollapsiblePanel/CollapsiblePanel";

import type { OvationProduct } from "../../../../../products/ovation";
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
import {
  OVAL_CANVAS_HEIGHT,
  OVAL_CANVAS_WIDTH,
  OVAL_LEVELS,
  countGlowLevels,
  maxGlowValue,
  ovalCanvasLabel,
  ovalLegendGradientCss,
  ovalLegendMarkerPos,
  paintGlow,
  paintLand,
  type RampMode,
} from "./oval-glow-paint";

import "./OvalGlow.scss";
import { SourceAttribution } from "../../../../sources";

const AURORA_SOURCE = {
  label: "NOAA/SWPC",
  href: "https://www.swpc.noaa.gov/products/aurora-30-minute-forecast",
};

/**
 * One pole-to-pole world stage: the Natural Earth land basemap and the glow,
 * painted through the same projection from the same product and ramp mode.
 * Rendered twice – inline in the panel and inside the full-size modal – so
 * each carries its own canvases and paint effects while the paint functions
 * stay shared: the two stages cannot drift. Mounting runs both paints (the
 * panel only renders stages once the product exists), which keeps the old
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
 * labels – shared by the inline panel and the full-size modal, so both
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
 * Oval glow Dashboard panel – the real OVATION 1-degree grid as
 * one continuous NASA-style glow ramp on a single pole-to-pole world canvas
 * over a Natural Earth land basemap painted with the same projection,
 * headed Oval glow with forecast time, glow intensity table,
 * color-blind toggle, map, legend and full-size view. Color wash only in
 * the default mode; Color-blind (ticket 06) swaps the ramp to the viridis
 * palette via the toggle beside the legend (permanent from 2026-09-08; the
 * white luminance ramp it replaced is commented out in `oval-glow-paint`).
 * The `#oval-glow` anchor stays on the inner content so Guide deep-links
 * keep landing. Paint math lives in `./oval-glow-paint`.
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
  // stages are only mounted after that (inside the loaded content) - each
  // OvalStage's own land paint effect runs on its mount, so the basemap
  // cannot silently miss the data either way.
  const landData = landQuery.data ?? null;

  // A div, not a section: the panel's h2 names the unit, so an inner
  // landmark would be redundant. The id stays for the Guide deep-link
  // anchor.
  let content: React.ReactNode;
  if (ovalQuery.isPending && !product) {
    content = (
      <div id="oval-glow" className="oval-glow" aria-busy="true">
        <p>Loading oval glow…</p>
      </div>
    );
  } else if (state === "never-loaded" || !product) {
    content = (
      <div id="oval-glow" className="oval-glow">
        <p>{COULDNT_LOAD_COPY}</p>
      </div>
    );
  } else {
    content = (
      <div id="oval-glow" className="oval-glow">
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
            label="Oval glow, full size"
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
        <SourceAttribution source={AURORA_SOURCE} />
      </div>
    );
  }

  return (
    <article className="oval-glow-panel">
      <CollapsiblePanel
        heading={<h2>Oval glow</h2>}
        bodyId="oval-glow-panel-body"
        adornment={
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
        }
      >
        {content}
      </CollapsiblePanel>
    </article>
  );
};

export default OvalGlow;
