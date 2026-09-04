/** Oval forecast grid – `ovation_aurora_latest.json` (ticket 03). */

export interface OvationCell {
  longitude: number;
  latitude: number;
  /** Forecast intensity per 1-degree cell; `0` means no forecast (transparent). */
  aurora: number;
}

export interface OvationProduct {
  observationTime: string;
  forecastTime: string;
  coordinates: OvationCell[];
}

/** Intensity band for one Oval cell; `none` renders transparent. */
export type AuroraBand = "none" | "faint" | "moderate" | "strong" | "intense";

export const OVATION_URL =
  "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json";

/** TanStack query key for the live Oval grid; the `live` segment flags polling. */
export const OVATION_QUERY_KEY = ["ovation", "live"] as const;

/** Flags the Oval grid as a real-time JSON product (ADR-0003 polling discipline). */
export const OVATION_LIVE = true as const;

/** Poll every 5 minutes; the 30-minute forecast updates on a fixed schedule. */
export const OVATION_REFETCH_INTERVAL_MS = 5 * 60 * 1000;

/** Never poll while the tab is hidden (battery discipline). */
export const OVATION_REFETCH_IN_BACKGROUND = false as const;

/** Cached grid stays fresh for 60 seconds between mounts. */
export const OVATION_STALE_TIME_MS = 60 * 1000;

/**
 * Starting intensity bands, calibrated against the live 2026-09-04 sample
 * (`max 14` quiet; storms reach higher). Versioned so migration is trivial.
 */
export const OVATION_BAND_VERSION = 1 as const;

/** Expected `Data Format` header in the OVATION payload. */
const EXPECTED_DATA_FORMAT = "[Longitude, Latitude, Aurora]";

/**
 * Maps one Aurora intensity to its band: `0` transparent, `1-5` faint,
 * `6-10` moderate, `11-15` strong, `16+` intense.
 */
export function auroraBand(aurora: number): AuroraBand {
  if (aurora < 1) return "none";
  if (aurora <= 5) return "faint";
  if (aurora <= 10) return "moderate";
  if (aurora <= 15) return "strong";
  return "intense";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parses the OVATION JSON string into a typed Oval grid.
 * Throws a format-changed error if the NOAA shape is unexpected.
 * Extra payload fields (e.g. live `type: "MultiPoint"`) are tolerated so the
 * parser tracks the served shape, not the spec's stale `FeatureCollection`.
 */
export function parseOvation(text: string): OvationProduct {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      "parseOvation: invalid JSON – the NOAA format may have changed",
    );
  }
  if (!isRecord(parsed)) {
    throw new Error(
      "parseOvation: root is not an object – the NOAA format may have changed",
    );
  }
  const { "Observation Time": observationTime, "Forecast Time": forecastTime, "Data Format": dataFormat, coordinates } =
    parsed as Record<string, unknown>;
  if (typeof observationTime !== "string" || observationTime === "") {
    throw new Error(
      "parseOvation: missing Observation Time – the NOAA format may have changed",
    );
  }
  if (typeof forecastTime !== "string" || forecastTime === "") {
    throw new Error(
      "parseOvation: missing Forecast Time – the NOAA format may have changed",
    );
  }
  if (dataFormat !== EXPECTED_DATA_FORMAT) {
    throw new Error(
      "parseOvation: unexpected Data Format – the NOAA format may have changed",
    );
  }
  if (!Array.isArray(coordinates)) {
    throw new Error(
      "parseOvation: coordinates is not an array – the NOAA format may have changed",
    );
  }
  const cells: OvationCell[] = coordinates.map((item, index) => {
    if (!Array.isArray(item) || item.length !== 3) {
      throw new Error(
        `parseOvation: item ${index} is not a [lon, lat, aurora] triple – the NOAA format may have changed`,
      );
    }
    const [longitude, latitude, aurora] = item as unknown[];
    if (
      typeof longitude !== "number" ||
      typeof latitude !== "number" ||
      typeof aurora !== "number" ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(aurora) ||
      aurora < 0
    ) {
      throw new Error(
        `parseOvation: item ${index} has non-numeric values – the NOAA format may have changed`,
      );
    }
    return { longitude, latitude, aurora };
  });
  return { observationTime, forecastTime, coordinates: cells };
}
