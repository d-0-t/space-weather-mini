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

const DEG = Math.PI / 180;

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