import { useQuery } from "@tanstack/react-query";

import FullSizeModal from "../../../../FullSizeModal";
import { SourceAttribution } from "../../../../sources";
import { formatAge } from "../../../../../products/live-helpers";
import {
  KpBar,
  fetchKpObserved,
  formatKp,
  formatTimeSlot,
} from "../kp-panel/kp-panel";

import "./AuroraNow.scss";

const AURORA_IMAGE_URLS = {
  north: "https://services.swpc.noaa.gov/images/animations/ovation/north/latest.jpg",
  south: "https://services.swpc.noaa.gov/images/animations/ovation/south/latest.jpg",
};

const AURORA_SOURCE = {
  label: "NOAA/SWPC",
  href: "https://www.swpc.noaa.gov/products/aurora-30-minute-forecast",
};

const auroraAlt = (pole: string) => `Aurora Forecast (latest) - ${pole} Pole`;

export interface MoonPhase {
  emoji: string;
  name: string;
}

const MOON_PHASES: MoonPhase[] = [
  { emoji: "🌑", name: "New moon" },
  { emoji: "🌒", name: "Waxing crescent" },
  { emoji: "🌓", name: "First quarter" },
  { emoji: "🌔", name: "Waxing gibbous" },
  { emoji: "🌕", name: "Full moon" },
  { emoji: "🌖", name: "Waning gibbous" },
  { emoji: "🌗", name: "Last quarter" },
  { emoji: "🌘", name: "Waning crescent" },
];

const SYNODIC_MONTH_DAYS = 29.530588853;
// Known new moon reference: 2000-01-06 18:14 UTC (Meeus)
const NEW_MOON_REF_UTC = Date.UTC(2000, 0, 6, 18, 14);

/** Current moon phase from a date, as an emoji + name pair. */
export function getMoonPhase(date: Date = new Date()): MoonPhase {
  const daysSince = (date.getTime() - NEW_MOON_REF_UTC) / 86_400_000;
  const fraction = (((daysSince / SYNODIC_MONTH_DAYS) % 1) + 1) % 1;
  const index = Math.floor(fraction * 8) % 8;
  return MOON_PHASES[index];
}

/** Emoji-only moon badge – labelled via title + sr-only span. */
const MoonPhaseBadge: React.FC = () => {
  const phase = getMoonPhase();
  return (
    <span className="aurora-now__moon" title={`Current Moon phase: ${phase.name}`}>
      <span aria-hidden="true">{phase.emoji}</span>
      <span className="sr-only">{`Current Moon phase: ${phase.name}`}</span>
    </span>
  );
};

const AuroraNowHeader: React.FC = () => (
  <div className="aurora-now__header">
    <h2>Aurora Now</h2>
    <MoonPhaseBadge />
  </div>
);

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

  if (observedQuery.isPending && !observedQuery.data) {
    return (
      <article className="aurora-now" aria-busy="true">
        <AuroraNowHeader />
        <p>Loading Kp forecast…</p>
      </article>
    );
  }
  if (observedQuery.isError && !observedQuery.data) {
    return (
      <article className="aurora-now">
        <AuroraNowHeader />
        <p>Couldn&apos;t load Kp forecast. Please check back later.</p>
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
      <AuroraNowHeader />
      <div className="aurora-now__current">
        <span className="aurora-now__current__time">
          {formatTimeSlot(currentSlot)}
        </span>
        <span
          className={`aurora-now__current__kp kp${currentKpRounded >= 9 ? "9" : currentKpRounded + "" + (currentKpRounded + 1)}`}
        >
          {formatKp(currentKp)}
        </span>
      </div>
      <KpBar kp={currentKpRounded} />
      {observedQuery.isError && observed ? (
        <p aria-live="polite">
          ⚠ Live data unavailable – showing {formatAge(latestObserved.time_tag)}-old cache
        </p>
      ) : null}
      <h3>Aurora Oval Forecast</h3>
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
    </article>
  );
};

export default AuroraNow;