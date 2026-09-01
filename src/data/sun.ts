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
 * dawn. The reference day is the device-local calendar day of `now`, so the
 * returned events belong to the same 00:00–24:00 day the Local conditions
 * timeline renders. During polar day and polar night the affected events
 * are null so the view can render the short polar copy instead of blank or
 * invalid dates.
 */
export function daylightTimes(
  latitudeDeg: number,
  longitudeDeg: number,
  now: Date,
): DaylightTimes {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    today: dayTimes(latitudeDeg, longitudeDeg, day),
    tomorrow: dayTimes(latitudeDeg, longitudeDeg, new Date(day.getTime() + DAY_MS)),
  };
}