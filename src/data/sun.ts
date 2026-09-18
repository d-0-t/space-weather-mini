/**
 * Solar position for the "Relevant now" webcam view: whether the sun is
 * currently above the horizon at a camera station's coordinates. Uses the
 * standard NOAA solar-elevation approximation (equation of time, solar
 * declination, hour angle) with the station's longitude in place of the
 * observer's timezone, so local solar time is derived from UTC directly.
 *
 * The threshold is the horizon (elevation < 0°), not full night: auroras are
 * regularly visible during twilight, and near the solstices high-latitude
 * stations only reach twilight, never true darkness. A station is therefore
 * hidden only while the sun is actually up (including midnight-sun seasons).
 */

import { getTimes } from "suncalc";

/** The calendar day (1-based month) an instant falls on in a zone. */
interface ZonedDayKey {
  year: number;
  month: number;
  day: number;
}

/** The Y/M/D the zone's clock shows for an instant (month 1-based). */
const zonedDayKey = (date: Date, timeZone: string): ZonedDayKey => {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
};

/**
 * The midnight instant of the zoned calendar day `date` falls on – the
 * same wall-clock-to-instant resolution the app's device-local day picks
 * gets, resolved through the zone's own offset (two passes, so a DST
 * boundary between the guess and the day settles). Noon-anchored callers
 * are never inside a DST gap, so the two passes always converge.
 */
const zonedMidnight = (date: Date, timeZone: string): Date => {
  const day = zonedDayKey(date, timeZone);
  const asUTC = (key: ZonedDayKey): number =>
    Date.UTC(key.year, key.month - 1, key.day);
  let utc = asUTC(day);
  for (let pass = 0; pass < 2; pass += 1) {
    const shown = zonedDayKey(new Date(utc), timeZone);
    utc += asUTC(day) - asUTC(shown);
  }
  return new Date(utc);
};

const DEG = Math.PI / 180;

/** Milliseconds in one day – the step between today and tomorrow. */
const DAY_MS = 86_400_000;

/** Day of year 1–366 for a UTC date. */
const dayOfYear = (date: Date): number => {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.floor((date.getTime() - start) / 86_400_000) + 1;
};

/** Fractional year in radians, from the day of year and UTC hour. */
const fractionalYear = (date: Date): number => {
  const hour =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;
  return (2 * Math.PI / 365) * (dayOfYear(date) - 1 + (hour - 12) / 24);
};

/** Equation of time in minutes (NOAA approximation). */
const equationOfTime = (gamma: number): number =>
  229.18 *
  (0.000075 +
    0.001868 * Math.cos(gamma) -
    0.032077 * Math.sin(gamma) -
    0.014615 * Math.cos(2 * gamma) -
    0.040849 * Math.sin(2 * gamma));

/** Solar declination in radians (NOAA approximation). */
const solarDeclination = (gamma: number): number =>
  0.006918 -
  0.399912 * Math.cos(gamma) +
  0.070257 * Math.sin(gamma) -
  0.006758 * Math.cos(2 * gamma) +
  0.000907 * Math.sin(2 * gamma) -
  0.002697 * Math.cos(3 * gamma) +
  0.00148 * Math.sin(3 * gamma);

/**
 * Solar elevation in degrees at a station (negative = below the horizon,
 * including twilight) for the given instant.
 */
export function solarElevationDegrees(
  latitudeDeg: number,
  longitudeDeg: number,
  date: Date,
): number {
  const gamma = fractionalYear(date);
  const decl = solarDeclination(gamma);
  // True solar time in minutes: UTC minutes shifted by the longitude's
  // 4 minutes per degree; negative (western) longitudes shift backwards.
  const trueSolarMinutes =
    date.getUTCHours() * 60 +
    date.getUTCMinutes() +
    date.getUTCSeconds() / 60 +
    4 * longitudeDeg;
  const hourAngleDeg = trueSolarMinutes / 4 - 180;
  const latitudeRad = latitudeDeg * DEG;
  const cosZenith =
    Math.sin(latitudeRad) * Math.sin(decl) +
    Math.cos(latitudeRad) * Math.cos(decl) * Math.cos(hourAngleDeg * DEG);
  return 90 - Math.acos(Math.min(1, Math.max(-1, cosZenith))) / DEG;
}

/**
 * True while the sun is below the horizon at the station – full night and
 * twilight alike. This is the "Relevant now" gate: a station is skipped only
 * in local daylight, and stays visible whenever auroras could be on.
 */
export function isSunBelowHorizon(
  latitudeDeg: number,
  longitudeDeg: number,
  date: Date,
): boolean {
  return solarElevationDegrees(latitudeDeg, longitudeDeg, date) < 0;
}

/**
 * The instant's light at a place, in three honest steps: "day" while the sun
 * is up, "civil-twilight" while it sits 0 to −6° below the horizon (still too
 * bright for faint aurora), and "dark" once it is lower (nautical and
 * astronomical twilight and Night). Used by Home surfaces that must not
 * promise aurora in a bright sky.
 */
export type SunState = "day" | "civil-twilight" | "dark";

/**
 * Classifies a solar elevation in degrees: at or above the horizon is day,
 * 0 to −6 is civil twilight, lower is dark. Pure, so the boundaries are
 * unit-pinned independently of the solar model.
 */
export function sunStateFromElevation(elevationDegrees: number): SunState {
  if (elevationDegrees >= 0) return "day";
  if (elevationDegrees >= -6) return "civil-twilight";
  return "dark";
}

/** The instant's light state at a place (the NOAA solar elevation classified). */
export function sunState(
  latitudeDeg: number,
  longitudeDeg: number,
  date: Date,
): SunState {
  return sunStateFromElevation(
    solarElevationDegrees(latitudeDeg, longitudeDeg, date),
  );
}

/** The daylight events of one calendar day at a place, for Local conditions. */
export interface DaylightDay {
  /** UTC midnight of the day the events belong to. */
  date: Date;
  sunrise: Date | null;
  sunset: Date | null;
  solarNoon: Date | null;
  /** Morning and evening civil twilight boundaries (sun at −6°). */
  civilDawn: Date | null;
  civilDusk: Date | null;
  /** Morning and evening nautical twilight boundaries (sun at −12°). */
  nauticalDawn: Date | null;
  nauticalDusk: Date | null;
  /** Morning and evening astronomical twilight boundaries (sun at −18°). */
  astronomicalDawn: Date | null;
  astronomicalDusk: Date | null;
  /** Night: astronomical dusk (−18°) until the next astronomical dawn. */
  darkWindowStart: Date | null;
  darkWindowEnd: Date | null;
  /** Sunset minus sunrise in minutes; null during polar day or polar night. */
  dayLengthMinutes: number | null;
  /**
   * "midnight-sun" while the sun never sets, "polar-night" while it never
   * rises, else null – drives the short polar copy in the Local conditions
   * view when sunrise and sunset are both null.
   */
  polar: "midnight-sun" | "polar-night" | null;
}

/** Today's and tomorrow's daylight events at a place, computed together. */
export interface DaylightTimes {
  today: DaylightDay;
  tomorrow: DaylightDay;
}

/**
 * suncalc's published types claim every event is a Date, but at the poles
 * (midnight sun, polar night) it returns null – the same nulls the polar
 * copy in the Local conditions view relies on. Normalise to nullable Dates.
 */
type SuncalcTimes = Record<keyof ReturnType<typeof getTimes>, Date | null> & {
  alwaysUp?: true;
  alwaysDown?: true;
};

const suncalcDayTimes = (
  latitudeDeg: number,
  longitudeDeg: number,
  date: Date,
): SuncalcTimes =>
  getTimes(date, latitudeDeg, longitudeDeg) as unknown as SuncalcTimes;

const dayTimes = (
  latitudeDeg: number,
  longitudeDeg: number,
  day: Date,
): DaylightDay => {
  // suncalc keys its event set to the solar cycle around the nearest
  // transit, so the civil noon of the day always resolves to that day's
  // events – local midnight can fall in the previous solar cycle and
  // return yesterday's times.
  const times = suncalcDayTimes(
    latitudeDeg,
    longitudeDeg,
    new Date(day.getTime() + DAY_MS / 2),
  );
  const next = new Date(day.getTime() + DAY_MS);
  const nextTimes = suncalcDayTimes(
    latitudeDeg,
    longitudeDeg,
    new Date(next.getTime() + DAY_MS / 2),
  );
  const sunrise = times.sunrise;
  const sunset = times.sunset;
  return {
    date: day,
    sunrise,
    sunset,
    solarNoon: times.solarNoon,
    civilDawn: times.dawn,
    civilDusk: times.dusk,
    nauticalDawn: times.nauticalDawn,
    nauticalDusk: times.nauticalDusk,
    astronomicalDawn: times.nightEnd,
    astronomicalDusk: times.night,
    darkWindowStart: times.night,
    darkWindowEnd: nextTimes.nightEnd,
    dayLengthMinutes:
      sunrise !== null && sunset !== null
        ? Math.round((sunset.getTime() - sunrise.getTime()) / 60_000)
        : null,
    polar: times.alwaysUp
      ? "midnight-sun"
      : times.alwaysDown
        ? "polar-night"
        : null,
  };
};

/**
 * Daylight for today and tomorrow at a place, derived on device with suncalc
 * (ADR 0005): sunrise, sunset, solar noon, the three twilight intervals and
 * the Night interval between astronomical dusk and the next astronomical
 * dawn. The reference day is the calendar day `now` falls on – the
 * device-local day by default, or the `referenceZone` calendar day when one
 * is given (the push sender keys the Daily outlook to the stored place's
 * own day, not the poll runtime's UTC day) – so the returned events belong
 * to the same 00:00–24:00 day the Local conditions timeline renders.
 * During polar day and polar night the affected events are null so the view
 * can render the short polar copy instead of blank or invalid dates.
 */
export function daylightTimes(
  latitudeDeg: number,
  longitudeDeg: number,
  now: Date,
  referenceZone?: string,
): DaylightTimes {
  const day = referenceZone
    ? zonedMidnight(now, referenceZone)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    today: dayTimes(latitudeDeg, longitudeDeg, day),
    tomorrow: dayTimes(latitudeDeg, longitudeDeg, new Date(day.getTime() + DAY_MS)),
  };
}

/** The darkest luminosity band a day reaches, for the weather line's label. */
export type DarkestBand =
  | "night"
  | "astronomical-twilight"
  | "nautical-twilight"
  | "civil-twilight";

/**
 * The darkest period of the reference day at a place: a window in the
 * deepest band the day reaches – the Night band when the sun crosses −18°,
 * else the deepest twilight it reaches (astronomical → nautical → civil) –
 * or one of the two flat polar states. A window's `start` is that band's
 * evening entry and `end` the next morning's exit, so it always names the
 * coming dark stretch (or the one in progress). `all-dark` is the deep
 * polar night where the sun never leaves the Night band; `polar-day` is
 * midnight sun, when no dark window exists at all.
 */
export type DarkestWindow =
  | { kind: "window"; band: DarkestBand; start: Date; end: Date }
  | { kind: "all-dark" }
  | { kind: "polar-day" };

export function darkestWindow(daylight: DaylightTimes): DarkestWindow {
  const { today, tomorrow } = daylight;
  if (today.darkWindowStart && today.darkWindowEnd) {
    return {
      kind: "window",
      band: "night",
      start: today.darkWindowStart,
      end: today.darkWindowEnd,
    };
  }
  if (today.nauticalDusk && tomorrow.nauticalDawn) {
    return {
      kind: "window",
      band: "astronomical-twilight",
      start: today.nauticalDusk,
      end: tomorrow.nauticalDawn,
    };
  }
  if (today.civilDusk && tomorrow.civilDawn) {
    return {
      kind: "window",
      band: "nautical-twilight",
      start: today.civilDusk,
      end: tomorrow.civilDawn,
    };
  }
  if (today.sunset && tomorrow.sunrise) {
    return {
      kind: "window",
      band: "civil-twilight",
      start: today.sunset,
      end: tomorrow.sunrise,
    };
  }
  return today.polar === "polar-night"
    ? { kind: "all-dark" }
    : { kind: "polar-day" };
}