/**
 * Per-panel Compact (dashboard layout ticket 05, CONTEXT.md "Compact"):
 * a dense-mode checkbox per Dashboard panel, persisted per panel default
 * off, with a one-time migration from the removed global toggle.
 */

/** The Dashboard panels that own a Compact toggle (v1 scope). */
export type CompactPanelId = "solar-wind" | "magnetosphere" | "pinned-webcams";

/** Every v1 Compact panel, in vocabulary order. */
export const COMPACT_PANELS: readonly CompactPanelId[] = [
  "solar-wind",
  "magnetosphere",
  "pinned-webcams",
];

/** The removed global toggle this replaces (values "on" / "off"). */
export const LEGACY_COMPACT_VIEW_KEY = "compact-view";

/** Versioned per-panel key, following the `sw:oval:cb:v1` pattern. */
export function compactStorageKey(panel: CompactPanelId): string {
  return `sw:compact:${panel}:v1`;
}

/** The mode when nothing (or something corrupt) is stored: roomy. */
export const DEFAULT_COMPACT_MODE = false;

type CompactStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * One-time migration from the legacy global key: legacy "on" maps to all
 * three panels on, then the legacy key is removed. Legacy "off" or missing
 * leaves the per-panel defaults untouched.
 */
function migrateLegacyCompactView(storage: CompactStorage): void {
  let legacy: string | null = null;
  try {
    legacy = storage.getItem(LEGACY_COMPACT_VIEW_KEY);
  } catch {
    return;
  }
  if (legacy === null) return;
  if (legacy === "on") {
    for (const panel of COMPACT_PANELS) {
      try {
        storage.setItem(
          compactStorageKey(panel),
          JSON.stringify({ compact: true, v: 1 }),
        );
      } catch {
        // A full store must not break the Dashboard: panels fall back to off.
      }
    }
  }
  try {
    storage.removeItem(LEGACY_COMPACT_VIEW_KEY);
  } catch {
    // Removing the legacy key is best-effort only.
  }
}

/**
 * Loads one panel's persisted Compact mode, defaulting to off when missing,
 * corrupt, or stored under an unknown version. The first load also runs the
 * legacy global migration once, then deletes the legacy key.
 */
export function loadCompactPanel(
  storage: CompactStorage,
  panel: CompactPanelId,
): boolean {
  migrateLegacyCompactView(storage);
  try {
    const raw = storage.getItem(compactStorageKey(panel));
    if (!raw) return DEFAULT_COMPACT_MODE;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return DEFAULT_COMPACT_MODE;
    }
    const { compact, v } = parsed as Record<string, unknown>;
    if (v !== 1 || typeof compact !== "boolean") {
      return DEFAULT_COMPACT_MODE;
    }
    return compact;
  } catch {
    return DEFAULT_COMPACT_MODE;
  }
}

/** Persists one panel's Compact mode as a versioned value. */
export function saveCompactPanel(
  storage: Pick<Storage, "setItem">,
  panel: CompactPanelId,
  compact: boolean,
): void {
  storage.setItem(compactStorageKey(panel), JSON.stringify({ compact, v: 1 }));
}
