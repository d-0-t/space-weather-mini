import { useQuery } from "@tanstack/react-query";

import FullSizeModal from "../../../../FullSizeModal";
import { SourceAttribution } from "../../../../sources";
import { formatAge } from "../../../../../products/live-helpers";
import { ChartHelp } from "../live-panels/live-panels";
import { getMoonPhase } from "../../../../moon/moon";
import CollapsiblePanel from "../../../../CollapsiblePanel/CollapsiblePanel";
import {
  KpBar,
  fetchKpObserved,
  formatKp,
  formatTimeSlot,
} from "../kp-panel/kp-panel";

import "./AuroraNow.scss";

const AURORA_IMAGE_URLS = {
  north:
    "https://services.swpc.noaa.gov/images/animations/ovation/north/latest.jpg",
  south:
    "https://services.swpc.noaa.gov/images/animations/ovation/south/latest.jpg",
};

const AURORA_SOURCE = {
  label: "NOAA/SWPC",
  href: "https://www.swpc.noaa.gov/products/aurora-30-minute-forecast",
};

const auroraAlt = (pole: string) => `Aurora Forecast (latest) - ${pole} Pole`;

/** Emoji-only moon badge – opens a help popover with the phase label and what it means for aurora. */
const MoonPhaseBadge: React.FC = () => {
  const phase = getMoonPhase();
  return (
    <ChartHelp
      className="live-panel__help--moon"
      content={{
        label: "About the current Moon phase",
        rows: [["Current Moon phase", phase.name]],
        text: `A bright Moon washes out faint aurora, so the darkest skies around the new moon are best for aurora watching.`,
      }}
      summary={
        <>
          <span aria-hidden="true">{phase.emoji}</span>
          <span className="sr-only">{`Current Moon phase: ${phase.name}`}</span>
        </>
      }
    />
  );
};

const AURORA_VIEWBOX = "0 0 300 190";

const AURORA_LAYER_COUNT = 9;

/** Smooth constant-thickness wavy band for one curtain layer; i = 0 is the bottom layer. */
function auroraRibbonPath(i: number): string {
  const thickness = 26 + (i % 3) * 6;
  const baseY = 144 - i * 14;
  const phase = i * 1.1;
  const amp = 6 + (i % 3) * 3;
  const step = 50;
  const w = 300;
  const yAt = (x: number, k: number) =>
    baseY + Math.sin((x / w) * Math.PI * 3 + phase + k) * amp;

  let d = `M 0 ${yAt(0, 0)}`;
  for (let x = step; x <= w; x += step) {
    const c1 = x - step * 0.7;
    const c2 = x - step * 0.3;
    d += ` C ${c1} ${yAt(c1, 0)}, ${c2} ${yAt(c2, 0)}, ${x} ${yAt(x, 0)}`;
  }
  d += ` L ${w} ${yAt(w, 0) + thickness}`;
  for (let x = w - step; x >= 0; x -= step) {
    const c1 = x + step * 0.3;
    const c2 = x + step * 0.7;
    d += ` C ${c1} ${yAt(c1, 0) + thickness}, ${c2} ${yAt(c2, 0) + thickness}, ${x} ${
      yAt(x, 0) + thickness
    }`;
  }
  return `${d} Z`;
}

/** Decorative aurora curtain behind the Kp badge; layer n lights up when Kp ≥ n. */
const AuroraCurtain: React.FC<{ kp: number }> = ({ kp }) => {
  const lit = Math.max(0, Math.min(AURORA_LAYER_COUNT, Math.round(kp)));
  const level = Math.max(1, lit);
  const blurPx = level === 9 ? 3 : 24 - Math.abs(level - 3) * 4;
  return (
    <div className="aurora-now__curtain">
      <svg
        className="aurora-now__curtain__svg"
        style={{ "--curtain-blur": `${blurPx}px` } as React.CSSProperties}
        viewBox={AURORA_VIEWBOX}
        preserveAspectRatio="xMidYMin meet"
        aria-hidden="true"
      >
        {Array.from({ length: AURORA_LAYER_COUNT }, (_, i) => {
          const level = i + 1;
          return (
            <path
              key={level}
              className={`aurora-now__curtain__layer aurora-now__curtain__layer--${level}${
                level <= lit ? " aurora-now__curtain__layer--active" : ""
              }`}
              d={auroraRibbonPath(i)}
            />
          );
        })}
      </svg>
    </div>
  );
};

/**
 * Aurora Now – current Kp index on the starry sky, plus the NOAA Ovation
 * 30-minute aurora oval forecast images for both hemispheres.
 */
const AuroraNow: React.FC = () => {
  const observedQuery = useQuery({
    queryKey: ["planetary-k-index", "live"],
    queryFn: fetchKpObserved,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const header = <h2>Aurora Now</h2>;
  const badge = <MoonPhaseBadge />;

  if (observedQuery.isPending && !observedQuery.data) {
    return (
      <article className="aurora-now" aria-busy="true">
        <CollapsiblePanel
          heading={header}
          bodyId="aurora-now-panel-body"
          adornment={badge}
        >
          <p>Loading Kp forecast…</p>
        </CollapsiblePanel>
      </article>
    );
  }
  if (observedQuery.isError && !observedQuery.data) {
    return (
      <article className="aurora-now">
        <CollapsiblePanel
          heading={header}
          bodyId="aurora-now-panel-body"
          adornment={badge}
        >
          <p>Couldn&apos;t load Kp forecast. Please check back later.</p>
        </CollapsiblePanel>
      </article>
    );
  }
  if (!observedQuery.data) return null;

  const observed = observedQuery.data;
  const latestObserved = observed[observed.length - 1];
  const currentKp = latestObserved.Kp;
  const currentKpRounded = Math.floor(currentKp);
  // Current 3h window label derived from the latest observed time_tag.
  const observedTime = new Date(`${latestObserved.time_tag}Z`);
  const slotStart = Number.isNaN(observedTime.getTime())
    ? NaN
    : Math.floor(observedTime.getUTCHours() / 3) * 3;
  const currentSlot = Number.isNaN(slotStart)
    ? ""
    : `${String(slotStart).padStart(2, "0")}-${String(slotStart + 3).padStart(2, "0")}UT`;

  return (
    <article className="aurora-now">
      <AuroraCurtain kp={currentKp} />
      <CollapsiblePanel
        heading={header}
        bodyId="aurora-now-panel-body"
        adornment={badge}
      >
        <div className="aurora-now__current">
          <span className="aurora-now__current__time">
            {formatTimeSlot(currentSlot)}
          </span>
          <span
            className={`aurora-now__current__kp kpx${currentKpRounded >= 9 ? "9" : currentKpRounded + "" + (currentKpRounded + 1)}`}
          >
            {formatKp(currentKp)}
          </span>
        </div>
        <KpBar kp={currentKpRounded} />
        {observedQuery.isError && observed ? (
          <p aria-live="polite">
            ⚠ Live data unavailable – showing{" "}
            {formatAge(latestObserved.time_tag)}
            -old cache
          </p>
        ) : null}
        <h3>Aurora Oval Forecast (30 min)</h3>
        <div className="aurora-images">
          <FullSizeModal
            label="Aurora forecast, latest, North Pole, full size"
            triggerClassName="aurora-images__tile"
            trigger={
              <img alt={auroraAlt("North")} src={AURORA_IMAGE_URLS.north} />
            }
          >
            <img alt={auroraAlt("North")} src={AURORA_IMAGE_URLS.north} />
          </FullSizeModal>
          <FullSizeModal
            label="Aurora forecast, latest, South Pole, full size"
            triggerClassName="aurora-images__tile"
            trigger={
              <img alt={auroraAlt("South")} src={AURORA_IMAGE_URLS.south} />
            }
          >
            <img alt={auroraAlt("South")} src={AURORA_IMAGE_URLS.south} />
          </FullSizeModal>
        </div>
        <SourceAttribution source={AURORA_SOURCE} />
      </CollapsiblePanel>
    </article>
  );
};

export default AuroraNow;
