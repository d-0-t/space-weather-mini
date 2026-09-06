/**
 * Color-blind mode toggle (ticket 06, CONTEXT.md "Color-blind mode"):
 * persists the per-user oval readability switch as a versioned value.
 */

export const COLOR_BLIND_STORAGE_KEY = "sw:oval:cb:v1";

/** The mode when nothing (or something corrupt) is stored: color wash on. */
export const DEFAULT_COLOR_BLIND_MODE = false;

/**
 * Loads the persisted Color-blind mode, defaulting to off when missing,
 * corrupt, or stored under an unknown version – the thresholds.ts pattern.
 */
export function loadColorBlindMode(storage: Pick<Storage, "getItem">): boolean {
  try {
    const raw = storage.getItem(COLOR_BLIND_STORAGE_KEY);
    if (!raw) return DEFAULT_COLOR_BLIND_MODE;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return DEFAULT_COLOR_BLIND_MODE;
    }
    const { colorBlind, v } = parsed as Record<string, unknown>;
    if (v !== 1 || typeof colorBlind !== "boolean") {
      return DEFAULT_COLOR_BLIND_MODE;
    }
    return colorBlind;
  } catch {
    return DEFAULT_COLOR_BLIND_MODE;
  }
}

/** Persists the Color-blind mode as a versioned value. */
export function saveColorBlindMode(
  storage: Pick<Storage, "setItem">,
  colorBlind: boolean,
): void {
  storage.setItem(
    COLOR_BLIND_STORAGE_KEY,
    JSON.stringify({ colorBlind, v: 1 }),
  );
}
