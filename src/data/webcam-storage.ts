/**
 * Versioned webcam preferences (ticket 02): the per-source hidden set and the
 * applied region filter, both persisted across visits. Corrupt or
 * foreign-shaped storage falls back to the default (nothing hidden, no
 * filter), mirroring the threshold storage pattern in products/thresholds.ts.
 */

import { WEBCAM_REGION_ORDER, type WebcamRegion } from "./webcams";

export const HIDDEN_WEBCAMS_STORAGE_KEY = "sw:webcams:hidden:v1";
export const WEBCAM_FILTER_STORAGE_KEY = "sw:webcams:filters:v1";

/** Loads the hidden source ids, defaulting to an empty set when missing or corrupt. */
export function loadHiddenSourceIds(
  storage: Pick<Storage, "getItem">,
): string[] {
  try {
    const raw = storage.getItem(HIDDEN_WEBCAMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((id): id is string => typeof id === "string"))];
  } catch {
    return [];
  }
}

/** Persists the hidden source ids as a versioned, de-duplicated array. */
export function saveHiddenSourceIds(
  storage: Pick<Storage, "setItem">,
  ids: string[],
): void {
  storage.setItem(
    HIDDEN_WEBCAMS_STORAGE_KEY,
    JSON.stringify([...new Set(ids)]),
  );
}

/** Loads the applied region filter, defaulting to no filter (show everything). */
export function loadFilteredRegions(
  storage: Pick<Storage, "getItem">,
): WebcamRegion[] {
  try {
    const raw = storage.getItem(WEBCAM_FILTER_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return [];
    const { v, regions } = parsed as Record<string, unknown>;
    if (v !== 1 || !Array.isArray(regions)) return [];
    return regions.filter(
      (region): region is WebcamRegion =>
        typeof region === "string" &&
        WEBCAM_REGION_ORDER.includes(region as WebcamRegion),
    );
  } catch {
    return [];
  }
}

/** Persists the applied region filter as a versioned value; empty means show everything. */
export function saveFilteredRegions(
  storage: Pick<Storage, "setItem">,
  regions: WebcamRegion[],
): void {
  storage.setItem(
    WEBCAM_FILTER_STORAGE_KEY,
    JSON.stringify({ v: 1, regions }),
  );
}