import { beforeEach, describe, expect, it } from "vitest";

import {
  COLOR_BLIND_STORAGE_KEY,
  DEFAULT_COLOR_BLIND_MODE,
  loadColorBlindMode,
  saveColorBlindMode,
} from "./color-blind";

describe("Color-blind mode storage (ticket 06)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to off when nothing is stored", () => {
    expect(loadColorBlindMode(localStorage)).toBe(false);
    expect(DEFAULT_COLOR_BLIND_MODE).toBe(false);
  });

  it("round-trips the toggle as a versioned value under the oval key", () => {
    saveColorBlindMode(localStorage, true);
    expect(localStorage.getItem(COLOR_BLIND_STORAGE_KEY)).toBe(
      JSON.stringify({ colorBlind: true, v: 1 }),
    );
    expect(loadColorBlindMode(localStorage)).toBe(true);
    saveColorBlindMode(localStorage, false);
    expect(loadColorBlindMode(localStorage)).toBe(false);
  });

  it("falls back to off on corrupt or foreign-shaped storage", () => {
    localStorage.setItem(COLOR_BLIND_STORAGE_KEY, "not json");
    expect(loadColorBlindMode(localStorage)).toBe(false);
    localStorage.setItem(COLOR_BLIND_STORAGE_KEY, JSON.stringify({ v: 1 }));
    expect(loadColorBlindMode(localStorage)).toBe(false);
    localStorage.setItem(
      COLOR_BLIND_STORAGE_KEY,
      JSON.stringify({ colorBlind: "yes", v: 1 }),
    );
    expect(loadColorBlindMode(localStorage)).toBe(false);
    localStorage.setItem(
      COLOR_BLIND_STORAGE_KEY,
      JSON.stringify({ colorBlind: true, v: 99 }),
    );
    expect(loadColorBlindMode(localStorage)).toBe(false);
  });
});
