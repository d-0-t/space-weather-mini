/** View distance – the banded estimate from the stored geocoded place to the
 * nearest Oval forecast cell (`ticket 05`, CONTEXT.md "View distance"). */

import { isBoundaryRow, type OvationCell } from "./ovation";

/** The View distance band: `Overhead / Nearby` through `Not in range`. */
export type ViewDistanceBand =
  | "nearby"
  | "distant"
  | "far"
  | "not-in-range";

/** The confidence label paired with each band. */
export type ViewDistanceConfidence =
  | "Likely"
  | "Possible"
  | "Unlikely"
  | "Not in range";

/** One row of the approved band table: name, km range and its confidence. */
export interface ViewDistanceBandSpec {
  band: ViewDistanceBand;
  /** Largest distance in km the band covers; the last row is out of range. */
  upToKm: number;
  /** The chaser-facing band name, e.g. `Overhead / Nearby`. */
  label: string;
  /** The km range, e.g. `0-100 km`; empty for out of range. */
  range: string;
  confidence: ViewDistanceConfidence;
}

/**
 * The approved View distance band table (CONTEXT.md "View distance"): the
 * single source of truth for the band mapping and the `(i)` popover rows.
 */
export const VIEW_DISTANCE_BANDS: readonly ViewDistanceBandSpec[] = [
  { band: "nearby", upToKm: 100, label: "Overhead / Nearby", range: "0-100 km", confidence: "Likely" },
  { band: "distant", upToKm: 300, label: "Distant", range: "100-300 km", confidence: "Possible" },
  { band: "far", upToKm: 600, label: "Far", range: "300-600 km", confidence: "Unlikely" },
  { band: "not-in-range", upToKm: Infinity, label: "Over 600 km", range: "", confidence: "Not in range" },
];

/** Confidence and band lookup, keyed once from the approved table. */
const BAND_BY_NAME = new Map(
  VIEW_DISTANCE_BANDS.map((spec) => [spec.band, spec] as const),
);

/** The View distance product: band, exact distance, and its confidence. */
export interface ViewDistance {
  band: ViewDistanceBand;
  /** Haversine distance to the nearest qualifying cell; null when out of range. */
  distanceKm: number | null;
  confidence: ViewDistanceConfidence;
}

/** Mean Earth radius in km – the haversine convention. */
const EARTH_RADIUS_KM = 6371;

/** The chaser-set View distance threshold when nothing is stored. */
export const DEFAULT_VIEW_DISTANCE_THRESHOLD = 6;

/** Versioned storage key so a future threshold change can migrate cleanly. */
export const VIEW_DISTANCE_THRESHOLD_STORAGE_KEY = "sw:view-distance:threshold:v1";

/** The Aurora scale runs 0-25 on quiet days and higher in storms; a useful
 * threshold lives in 1-25. */
function clampThreshold(value: number): number {
  return Math.min(25, Math.max(1, value));
}

/**
 * Loads the persisted View distance threshold (1-25), defaulting to 6 when
 * missing, corrupt, or stored under an unknown version – the thresholds.ts
 * pattern applied to the view-distance band.
 */
export function loadViewDistanceThreshold(
  storage: Pick<Storage, "getItem">,
): number {
  try {
    const raw = storage.getItem(VIEW_DISTANCE_THRESHOLD_STORAGE_KEY);
    if (!raw) return DEFAULT_VIEW_DISTANCE_THRESHOLD;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return DEFAULT_VIEW_DISTANCE_THRESHOLD;
    }
    const { threshold, v } = parsed as Record<string, unknown>;
    if (v !== 1 || typeof threshold !== "number" || Number.isNaN(threshold)) {
      return DEFAULT_VIEW_DISTANCE_THRESHOLD;
    }
    return clampThreshold(threshold);
  } catch {
    return DEFAULT_VIEW_DISTANCE_THRESHOLD;
  }
}

/** Persists the View distance threshold as a versioned value (clamped 1-25). */
export function saveViewDistanceThreshold(
  storage: Pick<Storage, "setItem">,
  threshold: number,
): void {
  storage.setItem(
    VIEW_DISTANCE_THRESHOLD_STORAGE_KEY,
    JSON.stringify({ threshold: clampThreshold(threshold), v: 1 }),
  );
}

/** Great-circle distance between two points, in km. */
function haversineKm(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number {
  const toRad = Math.PI / 180;
  const dLat = (toLatitude - fromLatitude) * toRad;
  const dLon = (toLongitude - fromLongitude) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(fromLatitude * toRad) *
      Math.cos(toLatitude * toRad) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * Distance to the nearest Oval cell with `Aurora >= threshold` within
 * `maxKm`: cells with `Aurora 0` (no forecast) and anything below the
 * threshold are ignored. Returns the band (not a single km) plus the exact
 * distance for callers that need it.
 */
export function distanceToNearestAurora(
  place: { latitude: number; longitude: number },
  cells: readonly OvationCell[],
  threshold: number = DEFAULT_VIEW_DISTANCE_THRESHOLD,
  maxKm: number = 600,
): ViewDistance {
  let nearestKm: number | null = null;
  for (const cell of cells) {
    if (cell.aurora < threshold) continue;
    // Boundary artifact rows are clipped from the painted map, so they are
    // not real forecast cells and never count as the nearest one.
    if (isBoundaryRow(cell.latitude)) continue;
    const km = haversineKm(
      place.latitude,
      place.longitude,
      cell.latitude,
      cell.longitude,
    );
    if (km <= maxKm && (nearestKm === null || km < nearestKm)) {
      nearestKm = km;
    }
  }
  // The approved table owns the band edges: first row whose `upToKm` covers
  // the distance, falling through to out of range past the last bound.
  const spec =
    VIEW_DISTANCE_BANDS.find(
      (entry) => nearestKm !== null && nearestKm <= entry.upToKm,
    ) ?? BAND_BY_NAME.get("not-in-range")!;
  return {
    band: spec.band,
    distanceKm: nearestKm,
    confidence: spec.confidence,
  };
}
