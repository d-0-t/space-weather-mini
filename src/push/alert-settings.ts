/**
 * The chaser's background-alert settings on the browser side (ticket 06):
 * the three alert type toggles and the hindrance gates, persisted versioned
 * so the sender's full settings object can be re-collected on every change
 * (the every-change overwrite path rides collectSettings). Corrupt or
 * foreign-shaped storage falls back to the defaults, mirroring the
 * threshold storage pattern in src/products/thresholds.ts.
 */

import {
  parseAlertTypes,
  parseHindranceGates,
  DEFAULT_GATES,
  type AlertTypeToggles,
  type HindranceGates,
} from "./subscription-settings";

/** The versioned localStorage key of the background-alert settings. */
export const ALERT_SETTINGS_STORAGE_KEY = "sw:alert-settings:v1";

/** The toggles + gates the UI edits and collectSettings sends. */
export interface AlertSettings {
  alertTypes: AlertTypeToggles;
  gates: HindranceGates;
}

/** Every type on, every gate on (the spec's defaults). */
export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  alertTypes: { daily: true, kp: true, live: true },
  gates: DEFAULT_GATES,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Loads the persisted background-alert settings (defaults when missing,
 * corrupt, or stored under an unknown version). The toggle and gate
 * validators are the sender's own strict parsers, so the two never drift.
 */
export function loadAlertSettings(
  storage: Pick<Storage, "getItem">,
): AlertSettings {
  try {
    const raw = storage.getItem(ALERT_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_ALERT_SETTINGS;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.v !== 1 || !isRecord(parsed.settings)) {
      return DEFAULT_ALERT_SETTINGS;
    }
    const { settings } = parsed;
    const alertTypes = parseAlertTypes(settings.alertTypes);
    const gates = parseHindranceGates(settings.gates);
    if (!alertTypes || !gates) return DEFAULT_ALERT_SETTINGS;
    return { alertTypes, gates };
  } catch {
    return DEFAULT_ALERT_SETTINGS;
  }
}

/** Persists the background-alert settings as a versioned value. */
export function saveAlertSettings(
  storage: Pick<Storage, "setItem">,
  settings: AlertSettings,
): void {
  storage.setItem(
    ALERT_SETTINGS_STORAGE_KEY,
    JSON.stringify({ v: 1, settings }),
  );
}
