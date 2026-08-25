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
