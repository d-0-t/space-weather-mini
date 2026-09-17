import { beforeEach, describe, expect, it } from "vitest";

import {
  COMPACT_PANELS,
  LEGACY_COMPACT_VIEW_KEY,
  compactStorageKey,
  loadCompactPanel,
  saveCompactPanel,
} from "./compact";

describe("Compact storage (dashboard layout ticket 05)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to off when nothing is stored", () => {
    for (const panel of COMPACT_PANELS) {
      expect(loadCompactPanel(localStorage, panel)).toBe(false);
    }
  });

  it("round-trips each panel independently as a versioned value", () => {
    saveCompactPanel(localStorage, "solar-wind", true);
    expect(localStorage.getItem(compactStorageKey("solar-wind"))).toBe(
      JSON.stringify({ compact: true, v: 1 }),
    );
    expect(loadCompactPanel(localStorage, "solar-wind")).toBe(true);
    // Other panels stay off: per-panel independence.
    expect(loadCompactPanel(localStorage, "magnetosphere")).toBe(false);
    expect(loadCompactPanel(localStorage, "pinned-webcams")).toBe(false);

    saveCompactPanel(localStorage, "solar-wind", false);
    expect(loadCompactPanel(localStorage, "solar-wind")).toBe(false);
  });

  it("falls back to off on corrupt or foreign-shaped storage", () => {
    const key = compactStorageKey("solar-wind");
    localStorage.setItem(key, "not json");
    expect(loadCompactPanel(localStorage, "solar-wind")).toBe(false);
    localStorage.setItem(key, JSON.stringify({ v: 1 }));
    expect(loadCompactPanel(localStorage, "solar-wind")).toBe(false);
    localStorage.setItem(key, JSON.stringify({ compact: "yes", v: 1 }));
    expect(loadCompactPanel(localStorage, "solar-wind")).toBe(false);
    localStorage.setItem(key, JSON.stringify({ compact: true, v: 99 }));
    expect(loadCompactPanel(localStorage, "solar-wind")).toBe(false);
  });

  it("migrates the legacy global on to all three panels on, then deletes the legacy key", () => {
    localStorage.setItem(LEGACY_COMPACT_VIEW_KEY, "on");
    // The first load triggers the one-time migration.
    expect(loadCompactPanel(localStorage, "solar-wind")).toBe(true);
    expect(loadCompactPanel(localStorage, "magnetosphere")).toBe(true);
    expect(loadCompactPanel(localStorage, "pinned-webcams")).toBe(true);
    expect(localStorage.getItem(LEGACY_COMPACT_VIEW_KEY)).toBeNull();
  });

  it("leaves defaults when the legacy key is off or missing", () => {
    localStorage.setItem(LEGACY_COMPACT_VIEW_KEY, "off");
    expect(loadCompactPanel(localStorage, "solar-wind")).toBe(false);
    expect(localStorage.getItem(LEGACY_COMPACT_VIEW_KEY)).toBeNull();

    localStorage.clear();
    expect(loadCompactPanel(localStorage, "solar-wind")).toBe(false);
  });
});
