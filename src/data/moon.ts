/**
 * Moon position for the interpreter's sky line (plain-language aurora
 * effort, ticket 02): whether the moon is up at an instant at a place, and
 * its rise/set times per day. Pure functions over the same on-device
 * ephemeris dependency as the daylight module (suncalc, ADR 0005) – injected
 * dates, no component state, no network. Phase and illumination live in
 * `src/components/moon/moon.ts` and stay untouched; phase alone cannot say
 * whether the moon is up (a full moon below the horizon must never veto a
 * night), which is why the altitude gate lives here.
 */

import { getMoonPosition, getMoonTimes } from "suncalc";

/** Milliseconds in one day – the width of a moon day window. */
const DAY_MS = 86_400_000;

/**
 * Moon events and up/down state for one day at a place. Mirrors the shape
 * of the daylight module's `DaylightDay`: a day anchor, nullable event
 * times and polar flags. Rise and set are the first of each event kind in
 * the day window (a local day can hold two of either near the day
 * boundaries; the extra events matter to no consumer here). When no
 * crossing happens at all, exactly one polar flag is set.
 */
export interface MoonDay {
  /** The instant the day window starts at (the day's local midnight). */
  date: Date;
  /** First moonrise of the day window; null when the moon never rises. */
  rise: Date | null;
  /** First moonset of the day window; null when the moon never sets. */
  set: Date | null;
  /** True while the moon stays above the horizon the whole day window. */
  alwaysUp: boolean;
  /** True while the moon stays below the horizon the whole day window. */
  alwaysDown: boolean;
}

/** Today's and tomorrow's moon events at a place, computed together. */
export interface MoonTimesTodayTomorrow {
  today: MoonDay;
  tomorrow: MoonDay;
}

/**
 * Apparent moon altitude in degrees at an instant (negative = below the
 * horizon): the refracted center of the disk, from suncalc's Meeus model.
 * Rise and set events use the USNO upper-limb convention (center plus
 * semidiameter plus horizon refraction), so a moon grazing the horizon can
 * carry rise/set events while the center-based gate stays below.
 */
export function moonAltitudeDegrees(
  latitudeDeg: number,
  longitudeDeg: number,
  date: Date,
): number {
  return getMoonPosition(date, latitudeDeg, longitudeDeg).altitude;
}

/**
 * True while the moon's center is at or above the horizon at the place –
 * the instant gate the sky line's moon half reads. Same horizon
 * convention as the daylight module's `isSunBelowHorizon` (negated).
 */
export function isMoonAboveHorizon(
  latitudeDeg: number,
  longitudeDeg: number,
  date: Date,
): boolean {
  return moonAltitudeDegrees(latitudeDeg, longitudeDeg, date) >= 0;
}

/** UTC midnight of the day an instant belongs to, in epoch milliseconds. */
const utcMidnight = (ms: number): number => Math.floor(ms / DAY_MS) * DAY_MS;

/**
 * suncalc v2's getMoonTimes scans the UTC calendar day of the date it is
 * given, so a day window that straddles a UTC midnight (any local
 * midnight away from UTC) needs both overlapping UTC-day scans, with the
 * events kept only when they fall inside the window.
 */
const crossingTimesInWindow = (
  latitudeDeg: number,
  longitudeDeg: number,
  windowStart: Date,
): { rises: Date[]; sets: Date[] } => {
  const startMs = windowStart.getTime();
  const endMs = startMs + DAY_MS;
  const scanDays = [
    ...new Set([utcMidnight(startMs), utcMidnight(endMs - 1)]),
  ];
  const rises: Date[] = [];
  const sets: Date[] = [];
  for (const dayMs of scanDays) {
    const times = getMoonTimes(new Date(dayMs), latitudeDeg, longitudeDeg);
    if (times.rise && times.rise.getTime() >= startMs && times.rise.getTime() < endMs) {
      rises.push(times.rise);
    }
    if (times.set && times.set.getTime() >= startMs && times.set.getTime() < endMs) {
      sets.push(times.set);
    }
  }
  const byTime = (a: Date, b: Date): number => a.getTime() - b.getTime();
  return { rises: rises.sort(byTime), sets: sets.sort(byTime) };
};

/**
 * Moon events for one day window at a place, from the window start to
 * 24 h later (the caller passes the day's local midnight). With no rise or
 * set inside the window the altitude sign cannot flip, so the polar flags
 * read from the same `isMoonAboveHorizon` gate the sky line uses at the
 * window start; a day with any crossing sets both flags false.
 */
export function moonDayTimes(
  latitudeDeg: number,
  longitudeDeg: number,
  windowStart: Date,
): MoonDay {
  const { rises, sets } = crossingTimesInWindow(latitudeDeg, longitudeDeg, windowStart);
  const noCrossing = rises.length === 0 && sets.length === 0;
  const aboveAtStart = isMoonAboveHorizon(latitudeDeg, longitudeDeg, windowStart);
  return {
    date: windowStart,
    rise: rises[0] ?? null,
    set: sets[0] ?? null,
    alwaysUp: noCrossing && aboveAtStart,
    alwaysDown: noCrossing && !aboveAtStart,
  };
}

/**
 * Moon events for today and tomorrow at a place, derived on device with
 * suncalc (ADR 0005): rise, set and the always-up / always-down polar
 * flags. The reference day is the device-local calendar day of `now` – the
 * same anchor `daylightTimes` uses, so the sky line passes one instant to
 * both and gets one shared "today". Each day window is the local
 * midnight-to-midnight stretch, stitched from suncalc's UTC-day scans when
 * the local midnight sits away from a UTC midnight.
 */
export function moonTimes(
  latitudeDeg: number,
  longitudeDeg: number,
  now: Date,
): MoonTimesTodayTomorrow {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    today: moonDayTimes(latitudeDeg, longitudeDeg, day),
    tomorrow: moonDayTimes(latitudeDeg, longitudeDeg, new Date(day.getTime() + DAY_MS)),
  };
}
