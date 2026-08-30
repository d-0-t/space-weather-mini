/**
 * Versioned webcam preferences: the per-source hidden set, the applied region
 * filter, and the opt-in auto-refresh setting (ticket 03), all persisted
 * across visits. Corrupt or foreign-shaped storage falls back to the default
 * (nothing hidden, no filter, auto-refresh off), mirroring the threshold
 * storage pattern in products/thresholds.ts.
 */

import { WEBCAM_REGION_ORDER, type WebcamRegion } from "./webcams";

export const HIDDEN_WEBCAMS_STORAGE_KEY = "sw:webcams:hidden:v1";
export const WEBCAM_FILTER_STORAGE_KEY = "sw:webcams:filters:v1";
export const AUTO_REFRESH_STORAGE_KEY = "sw:webcams:autorefresh:v1";
export const WEBCAM_PANELS_STORAGE_KEY = "sw:webcams:panels:v1";
export const PINNED_WEBCAMS_STORAGE_KEY = "sw:webcams:pins:v1";
export const PINS_AUTO_REFRESH_STORAGE_KEY = "sw:webcams:pins-autorefresh:v1";
export const WEBCAM_VIEW_STORAGE_KEY = "sw:webcams:view:v1";

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

/** Loads the opt-in auto-refresh setting, defaulting to off when missing or corrupt. */
export function loadAutoRefresh(storage: Pick<Storage, "getItem">): boolean {
  try {
    const raw = storage.getItem(AUTO_REFRESH_STORAGE_KEY);
    if (raw === null) return false;
    const parsed: unknown = JSON.parse(raw);
    return parsed === true;
  } catch {
    return false;
  }
}

/** Persists the opt-in auto-refresh setting as a versioned boolean. */
export function saveAutoRefresh(
  storage: Pick<Storage, "setItem">,
  enabled: boolean,
): void {
  storage.setItem(AUTO_REFRESH_STORAGE_KEY, JSON.stringify(enabled));
}

/**
 * Loads the section ids the visitor collapsed (region sections and the Webcam
 * links section), defaulting to none when missing or corrupt – every section
 * opens wide on a fresh visit.
 */
export function loadClosedPanels(
  storage: Pick<Storage, "getItem">,
): string[] {
  try {
    const raw = storage.getItem(WEBCAM_PANELS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return [];
    const { v, closed } = parsed as Record<string, unknown>;
    if (v !== 1 || !Array.isArray(closed)) return [];
    return closed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

/** Persists the collapsed section ids as a versioned array. */
export function saveClosedPanels(
  storage: Pick<Storage, "setItem">,
  ids: string[],
): void {
  storage.setItem(
    WEBCAM_PANELS_STORAGE_KEY,
    JSON.stringify({ v: 1, closed: ids }),
  );
}

/**
 * Loads the ids of the webcams pinned to the Dashboard (at most two by the
 * UI's contract), defaulting to an empty set when missing or corrupt. The
 * stored ids are resolved against the registry at render time, so stale ids
 * of removed cams stay inert in storage.
 */
export function loadPinnedIds(
  storage: Pick<Storage, "getItem">,
): string[] {
  try {
    const raw = storage.getItem(PINNED_WEBCAMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return [];
    const { v, pins } = parsed as Record<string, unknown>;
    if (v !== 1 || !Array.isArray(pins)) return [];
    return pins.filter((id): id is string => typeof id === "string").slice(0, 2);
  } catch {
    return [];
  }
}

/** Persists the pinned webcam ids as a versioned array, capped at two. */
export function savePinnedIds(
  storage: Pick<Storage, "setItem">,
  ids: string[],
): void {
  storage.setItem(
    PINNED_WEBCAMS_STORAGE_KEY,
    JSON.stringify({ v: 1, pins: [...new Set(ids)].slice(0, 2) }),
  );
}

/** Loads the Dashboard pinned-webcams auto-refresh consent, defaulting to off. */
export function loadPinsAutoRefresh(
  storage: Pick<Storage, "getItem">,
): boolean {
  try {
    const raw = storage.getItem(PINS_AUTO_REFRESH_STORAGE_KEY);
    if (raw === null) return false;
    const parsed: unknown = JSON.parse(raw);
    return parsed === true;
  } catch {
    return false;
  }
}

/** Persists the Dashboard pinned-webcams auto-refresh consent as a boolean. */
export function savePinsAutoRefresh(
  storage: Pick<Storage, "setItem">,
  enabled: boolean,
): void {
  storage.setItem(PINS_AUTO_REFRESH_STORAGE_KEY, JSON.stringify(enabled));
}

/** The three viewing modes of the webcams page; "curated" is the default tab. */
export type WebcamView = "curated" | "selection" | "all";

const WEBCAM_VIEWS: readonly WebcamView[] = ["curated", "selection", "all"];

/** Loads the selected viewing mode, defaulting to "curated" when missing or corrupt. */
export function loadViewMode(
  storage: Pick<Storage, "getItem">,
): WebcamView {
  try {
    const raw = storage.getItem(WEBCAM_VIEW_STORAGE_KEY);
    if (raw === null) return "curated";
    const parsed: unknown = JSON.parse(raw);
    return WEBCAM_VIEWS.includes(parsed as WebcamView)
      ? (parsed as WebcamView)
      : "curated";
  } catch {
    return "curated";
  }
}

/** Persists the selected viewing mode as a versioned string. */
export function saveViewMode(
  storage: Pick<Storage, "setItem">,
  view: WebcamView,
): void {
  storage.setItem(WEBCAM_VIEW_STORAGE_KEY, JSON.stringify(view));
}