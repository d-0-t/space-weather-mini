import "./LuminosityTimeline.scss";
import { useState } from "react";
import Rotate90DegreesCwIcon from "@mui/icons-material/Rotate90DegreesCw";
import { useDisplayTimezone } from "../../../../DisplayTimezone/DisplayTimezoneContext";
import type { DaylightDay } from "../../../../../data/sun";
import { formatClock } from "../../../../../products/display-time";
import { DAY_END_LABEL } from "../../utils/format";

/**
 * Luminosity levels of the day sections, darkest to brightest: the sun at
 * −18° (Night) through the three twilight bands up to sun up (Day).
 */
export const LUMINOSITY_LEVELS = [
  "Night",
  "Astronomical twilight",
  "Nautical twilight",
  "Civil twilight",
  "Day",
] as const;

interface TimelineBand {
  /** 0 = darkest (Night) … 4 = brightest (Day). */
  level: number;
  /** Duration in minutes; the band's width/height ratio on the timeline. */
  minutes: number;
  startTime: Date;
  /** null on the last band, which runs to the day end (24:00). */
  endTime: Date | null;
}

/**
 * The day as a chain of luminosity bands from 00:00 to 24:00. Each suncalc
 * boundary starts a band of its light level; from midnight to the first
 * boundary the sun sits one level below it, and the last band runs to
 * 24:00. Midnight sun collapses to one bright Day band, deep polar night
 * to one Night band.
 */
export const buildTimeline = (day: DaylightDay): TimelineBand[] => {
  const dayStart = day.date;
  const dayEnd = new Date(day.date.getTime() + 86_400_000);
  const boundaries = (
    [
      { time: day.astronomicalDawn, level: 1 },
      { time: day.nauticalDawn, level: 2 },
      { time: day.civilDawn, level: 3 },
      { time: day.sunrise, level: 4 },
      { time: day.sunset, level: 3 },
      { time: day.civilDusk, level: 2 },
      { time: day.nauticalDusk, level: 1 },
      { time: day.astronomicalDusk, level: 0 },
    ] as Array<{ time: Date | null; level: number }>
  ).filter(
    // Events of the day all sit inside its 00:00–24:00 window; events that
    // land outside it (extreme timezone offsets) are clipped, so a band
    // never wraps past midnight.
    (boundary): boundary is { time: Date; level: number } =>
      boundary.time !== null &&
      boundary.time.getTime() >= dayStart.getTime() &&
      boundary.time.getTime() < dayEnd.getTime(),
  );

  if (boundaries.length === 0) {
    const level = day.polar === "midnight-sun" ? 4 : 0;
    return [{ level, minutes: 1440, startTime: dayStart, endTime: null }];
  }

  const bands: TimelineBand[] = [];
  const first = boundaries[0];
  if (first.time.getTime() > dayStart.getTime()) {
    bands.push({
      level: Math.max(0, first.level - 1),
      minutes: (first.time.getTime() - dayStart.getTime()) / 60_000,
      startTime: dayStart,
      endTime: first.time,
    });
  }
  for (let i = 0; i < boundaries.length; i++) {
    const start = boundaries[i];
    const next = boundaries[i + 1];
    bands.push({
      level: start.level,
      minutes:
        ((next?.time ?? dayEnd).getTime() - start.time.getTime()) / 60_000,
      startTime: start.time,
      endTime: next?.time ?? null,
    });
  }
  return bands.filter((band) => band.minutes > 0);
};

/**
 * The luminosity timeline: one band per day section, sized by duration
 * ratio, dark to bright left to right on wide screens and top to bottom on
 * narrow ones. Each band shows its start time at the break and its name;
 * the last band closes at 24:00. The band times are instants and render in
 * the Display timezone (ticket 02). On wide screens the chart reads
 * horizontally; the rotate toggle (visible only there, like the oval glow
 * modal's portrait-only rotate) forces the narrow vertical reading back
 * for users who prefer it.
 */
const LuminosityTimeline: React.FC<{ day: DaylightDay }> = ({ day }) => {
  const bands = buildTimeline(day);
  const last = bands.length - 1;
  const { displayTimezone } = useDisplayTimezone();
  // Vertical reading preference on wide screens: layout lives entirely in
  // the sm breakpoint, so on narrow screens the chart is already vertical
  // and a stale state renders the same – no viewport listener needed.
  const [vertical, setVertical] = useState(false);
  return (
    <>
      <button
        type="button"
        className="btn--secondary conditions__timeline-rotate"
        title="Rotate daylight chart"
        aria-pressed={vertical}
        onClick={() => setVertical((current) => !current)}
      >
        <Rotate90DegreesCwIcon aria-hidden="true" fontSize="small" />
        <span className="sr-only">Rotate daylight chart</span>
      </button>
      <ul
        className={
          vertical
            ? "conditions__timeline conditions__timeline--vertical"
            : "conditions__timeline"
        }
      >
      {bands.map((band, index) => (
        <li
          key={index}
          className={`conditions__band conditions__band--l${band.level}`}
          style={{ flexGrow: band.minutes }}
        >
          <span className="conditions__band-time">
            {formatClock(band.startTime, displayTimezone)}
          </span>
          <span className="conditions__band-name">
            {LUMINOSITY_LEVELS[band.level]}
          </span>
          <span className="sr-only">
            to{" "}
            {band.endTime !== null
              ? formatClock(band.endTime, displayTimezone)
              : DAY_END_LABEL}
          </span>
          {index === last ? (
            <span className="conditions__band-time conditions__band-time--end">
              {DAY_END_LABEL}
            </span>
          ) : null}
        </li>
      ))}
      </ul>
    </>
  );
};

export default LuminosityTimeline;
