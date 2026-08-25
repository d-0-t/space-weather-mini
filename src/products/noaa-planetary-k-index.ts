/** Planetary K-index products — observed and forecast. */

export interface PlanetaryKPoint {
  /** ISO timestamp, e.g. "2026-08-18T00:00:00" */
  time_tag: string;
  /** Kp index value 0–9, may be fractional */
  Kp: number;
  a_running: number;
  station_count: number;
}

export interface PlanetaryKForecastPoint {
  time_tag: string;
  kp: number;
  observed: "observed" | "estimated" | "predicted";
  noaa_scale: string | null;
}

export const NOAA_PLANETARY_K_INDEX_URL =
  "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json";
export const NOAA_PLANETARY_K_INDEX_FORECAST_URL =
  "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parses the observed planetary K-index JSON string (array of points with Kp).
 * Throws if the NOAA format changes.
 */
export function parsePlanetaryKIndex(text: string): PlanetaryKPoint[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      "parsePlanetaryKIndex: invalid JSON — the NOAA format may have changed",
    );
  }
  if (!Array.isArray(parsed)) {
    throw new Error(
      "parsePlanetaryKIndex: root is not an array — the NOAA format may have changed",
    );
  }
  if (parsed.length === 0) {
    throw new Error(
      "parsePlanetaryKIndex: empty array — the NOAA format may have changed",
    );
  }
  return parsed.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(
        `parsePlanetaryKIndex: item ${index} is not an object — the NOAA format may have changed`,
      );
    }
    const { time_tag, Kp, a_running, station_count } = item as Record<string, unknown>;
    if (
      typeof time_tag !== "string" ||
      typeof Kp !== "number" ||
      typeof a_running !== "number" ||
      typeof station_count !== "number"
    ) {
      throw new Error(
        `parsePlanetaryKIndex: item ${index} missing required fields — the NOAA format may have changed`,
      );
    }
    return { time_tag, Kp, a_running, station_count };
  });
}

/**
 * Parses the planetary K-index forecast JSON string (array with kp + noaa_scale).
 * Throws if the NOAA format changes.
 */
export function parsePlanetaryKIndexForecast(text: string): PlanetaryKForecastPoint[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      "parsePlanetaryKIndexForecast: invalid JSON — the NOAA format may have changed",
    );
  }
  if (!Array.isArray(parsed)) {
    throw new Error(
      "parsePlanetaryKIndexForecast: root is not an array — the NOAA format may have changed",
    );
  }
  if (parsed.length === 0) {
    throw new Error(
      "parsePlanetaryKIndexForecast: empty array — the NOAA format may have changed",
    );
  }
  return parsed.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(
        `parsePlanetaryKIndexForecast: item ${index} is not an object — the NOAA format may have changed`,
      );
    }
    const { time_tag, kp, observed, noaa_scale } = item as Record<string, unknown>;
    if (
      typeof time_tag !== "string" ||
      typeof kp !== "number" ||
      (observed !== "observed" && observed !== "estimated" && observed !== "predicted") ||
      (noaa_scale !== null && typeof noaa_scale !== "string")
    ) {
      throw new Error(
        `parsePlanetaryKIndexForecast: item ${index} missing required fields — the NOAA format may have changed`,
      );
    }
    return {
      time_tag,
      kp: kp as number,
      observed: observed as PlanetaryKForecastPoint["observed"],
      noaa_scale: noaa_scale as string | null,
    };
  });
}
