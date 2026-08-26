/** Solar wind summary products — mag field (Bt, Bz GSM) and speed. */

export interface SolarWindMagField {
  bt: number;
  bz_gsm: number;
  time_tag: string;
}

export interface SolarWindSpeed {
  proton_speed: number;
  time_tag: string;
}

export const SOLAR_WIND_MAG_FIELD_URL =
  "https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json";
export const SOLAR_WIND_SPEED_URL =
  "https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json";

export const RTSW_WIND_URL =
  "https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json";
export const RTSW_MAG_FIELD_URL =
  "https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json";

export interface RtswWindPoint {
  time_tag: string;
  /** 1-min proton speed (km/s); null when the row lacks a reading */
  speed: number | null;
  /** 1-min proton density (p/cm³); null when the row lacks a reading */
  density: number | null;
  /** Spacecraft providing the reading: "IMAP", "SOLAR1" or "ACE" (all at L1) */
  source: string | null;
}

export interface RtswMagFieldPoint {
  time_tag: string;
  bt: number | null;
  bz_gsm: number | null;
}

/**
 * Parses solar-wind mag field JSON string (array with one object).
 * Throws if format changes.
 */
export function parseSolarWindMagField(text: string): SolarWindMagField {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      "parseSolarWindMagField: invalid JSON — the NOAA format may have changed",
    );
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(
      "parseSolarWindMagField: expected non-empty array — the NOAA format may have changed",
    );
  }
  const item = parsed[0] as Record<string, unknown>;
  const { bt, bz_gsm, time_tag } = item;
  if (typeof bt !== "number" || typeof bz_gsm !== "number" || typeof time_tag !== "string") {
    throw new Error(
      "parseSolarWindMagField: missing bt/bz_gsm/time_tag — the NOAA format may have changed",
    );
  }
  return { bt, bz_gsm, time_tag };
}

/**
 * Parses solar-wind speed JSON string (array with one object).
 * Throws if format changes.
 */
export function parseSolarWindSpeed(text: string): SolarWindSpeed {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      "parseSolarWindSpeed: invalid JSON — the NOAA format may have changed",
    );
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(
      "parseSolarWindSpeed: expected non-empty array — the NOAA format may have changed",
    );
  }
  const item = parsed[0] as Record<string, unknown>;
  const { proton_speed, time_tag } = item;
  if (typeof proton_speed !== "number" || typeof time_tag !== "string") {
    throw new Error(
      "parseSolarWindSpeed: missing proton_speed/time_tag — the NOAA format may have changed",
    );
  }
  return { proton_speed, time_tag };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

/**
 * Parses the 1-minute real-time solar wind array (speed + density).
 * The live feed is newest-first; returns points sorted oldest-first.
 * Rows may legitimately lack a speed or density reading (null).
 */
export function parseRtswWind(text: string): RtswWindPoint[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("parseRtswWind: invalid JSON — the NOAA format may have changed");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("parseRtswWind: expected non-empty array — the NOAA format may have changed");
  }
  const points = parsed.map((item, index) => {
    if (!isRecord(item) || typeof item.time_tag !== "string") {
      throw new Error(
        `parseRtswWind: item ${index} missing time_tag — the NOAA format may have changed`,
      );
    }
    return {
      time_tag: item.time_tag,
      speed: optionalNumber(item.proton_speed),
      density: optionalNumber(item.proton_density),
      source: optionalString(item.source),
    };
  });
  return points.sort((a, b) => a.time_tag.localeCompare(b.time_tag));
}

/**
 * Parses the 1-minute real-time magnetic field array (Bt, Bz GSM).
 * The live feed is newest-first; returns points sorted oldest-first.
 * Rows may legitimately lack a field reading (null).
 */
export function parseRtswMagField(text: string): RtswMagFieldPoint[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("parseRtswMagField: invalid JSON — the NOAA format may have changed");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("parseRtswMagField: expected non-empty array — the NOAA format may have changed");
  }
  const points = parsed.map((item, index) => {
    if (!isRecord(item) || typeof item.time_tag !== "string") {
      throw new Error(
        `parseRtswMagField: item ${index} missing time_tag — the NOAA format may have changed`,
      );
    }
    return {
      time_tag: item.time_tag,
      bt: optionalNumber(item.bt),
      bz_gsm: optionalNumber(item.bz_gsm),
    };
  });
  return points.sort((a, b) => a.time_tag.localeCompare(b.time_tag));
}
