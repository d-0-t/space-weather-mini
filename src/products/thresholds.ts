/**
 * Chaser-set Kp alert threshold, persisted versioned so future Horizon 2
 * thresholds (cloud, hemispheric power) can migrate without clash (ticket 02).
 */

export const DEFAULT_KP_THRESHOLD = 5;

export const KP_THRESHOLD_STORAGE_KEY = "sw:thresholds:v1";

function clamp(value: number): number {
  return Math.min(9, Math.max(1, value));
}

/**
 * Loads the persisted Kp threshold (1–9), defaulting to 5 when missing,
 * corrupt, or stored under an unknown version.
 */
export function loadKpThreshold(storage: Pick<Storage, "getItem">): number {
  try {
    const raw = storage.getItem(KP_THRESHOLD_STORAGE_KEY);
    if (!raw) return DEFAULT_KP_THRESHOLD;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return DEFAULT_KP_THRESHOLD;
    }
    const { kp, v } = parsed as Record<string, unknown>;
    if (v !== 1 || typeof kp !== "number" || Number.isNaN(kp)) {
      return DEFAULT_KP_THRESHOLD;
    }
    return clamp(kp);
  } catch {
    return DEFAULT_KP_THRESHOLD;
  }
}

/** Persists the Kp threshold as a versioned value (clamped to 1–9). */
export function saveKpThreshold(
  storage: Pick<Storage, "setItem">,
  kp: number,
): void {
  storage.setItem(KP_THRESHOLD_STORAGE_KEY, JSON.stringify({ kp: clamp(kp), v: 1 }));
}

/**
 * The NOAA G-scale level for a Kp value (G1 at Kp 5 through G5 at Kp 9);
 * values below 1 mean below G1. The geomagnetic storm scale keys G1–G5 to
 * Kp 5–9, so the mapping is `kp - 4`.
 */
export function gScaleForKp(kp: number): number {
  return kp - 4;
}

/**
 * The NOAA G-scale label for a Kp threshold (G1 at Kp 5 through G5 at Kp 9),
 * or null below G1.
 */
export function gLabelForThreshold(kp: number): string | null {
  const g = gScaleForKp(kp);
  return g >= 1 && g <= 5 ? `G${g}` : null;
}