import "./LuminosityTimeline.scss";
import type { DaylightDay } from "../../../../../data/sun";
import { DAY_END_LABEL, formatTime } from "../../utils/format";

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
 * the last band closes at 24:00.
 */
const LuminosityTimeline: React.FC<{ day: DaylightDay }> = ({ day }) => {
  const bands = buildTimeline(day);
  const last = bands.length - 1;
  return (
    <ul className="conditions__timeline">
      {bands.map((band, index) => (
        <li
          key={index}
          className={`conditions__band conditions__band--l${band.level}`}
          style={{ flexGrow: band.minutes }}
        >
          <span className="conditions__band-time">
            {formatTime(band.startTime)}
          </span>
          <span className="conditions__band-name">
            {LUMINOSITY_LEVELS[band.level]}
          </span>
          <span className="sr-only">
            to {band.endTime !== null ? formatTime(band.endTime) : DAY_END_LABEL}
          </span>
          {index === last ? (
            <span className="conditions__band-time conditions__band-time--end">
              {DAY_END_LABEL}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
};

export default LuminosityTimeline;
