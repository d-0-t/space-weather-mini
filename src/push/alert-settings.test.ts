import { afterEach, describe, expect, it } from "vitest";

import {
  ALERT_SETTINGS_STORAGE_KEY,
  DEFAULT_ALERT_SETTINGS,
  loadAlertSettings,
  saveAlertSettings,
} from "./alert-settings";
import { DEFAULT_GATES } from "./subscription-settings";

afterEach(() => localStorage.clear());

describe("alert settings storage (ticket 06)", () => {
  it("defaults every type on and every gate on when nothing is stored", () => {
    expect(DEFAULT_ALERT_SETTINGS).toEqual({
      alertTypes: { daily: true, kp: true, live: true },
      gates: DEFAULT_GATES,
    });
    expect(loadAlertSettings(localStorage)).toEqual(DEFAULT_ALERT_SETTINGS);
  });

  it("round-trips the settings under the versioned key", () => {
    const settings = {
      alertTypes: { daily: false, kp: true, live: false },
      gates: {
        cloudMaxPercent: 80,
        noPrecipitation: true,
        darknessBand: "nautical" as const,
      },
    };
    saveAlertSettings(localStorage, settings);
    expect(localStorage.getItem(ALERT_SETTINGS_STORAGE_KEY)).toBe(
      JSON.stringify({ v: 1, settings }),
    );
    expect(loadAlertSettings(localStorage)).toEqual(settings);
  });

  it("falls back to the defaults on corrupt or foreign-shaped storage", () => {
    for (const raw of [
      "not json",
      JSON.stringify({}),
      JSON.stringify({ v: 1, settings: null }),
      JSON.stringify({ v: 1, settings: { alertTypes: { daily: true } } }),
      JSON.stringify({
        v: 1,
        settings: {
          alertTypes: { daily: true, kp: true, live: true },
          gates: { cloudMaxPercent: 200 },
        },
      }),
      JSON.stringify({ v: 2, settings: DEFAULT_ALERT_SETTINGS }),
    ]) {
      localStorage.setItem(ALERT_SETTINGS_STORAGE_KEY, raw);
      expect(loadAlertSettings(localStorage)).toEqual(DEFAULT_ALERT_SETTINGS);
    }
  });

  it("loads a fully valid stored settings object unchanged", () => {
    localStorage.setItem(
      ALERT_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        settings: {
          alertTypes: { daily: false, kp: true, live: true },
          gates: { ...DEFAULT_GATES, cloudMaxPercent: 30 },
        },
      }),
    );
    expect(loadAlertSettings(localStorage)).toEqual({
      alertTypes: { daily: false, kp: true, live: true },
      gates: { ...DEFAULT_GATES, cloudMaxPercent: 30 },
    });
  });
});
