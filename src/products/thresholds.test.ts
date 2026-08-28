import { beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_KP_THRESHOLD,
  KP_THRESHOLD_STORAGE_KEY,
  gLabelForThreshold,
  gScaleForKp,
  loadKpThreshold,
  saveKpThreshold,
} from "./thresholds";

describe("Kp threshold storage (ticket 02)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to Kp 5 (G1) when nothing is stored", () => {
    expect(loadKpThreshold(localStorage)).toBe(5);
    expect(DEFAULT_KP_THRESHOLD).toBe(5);
  });

  it("round-trips the threshold as a versioned value", () => {
    saveKpThreshold(localStorage, 7);
    expect(localStorage.getItem(KP_THRESHOLD_STORAGE_KEY)).toBe(
      JSON.stringify({ kp: 7, v: 1 }),
    );
    expect(loadKpThreshold(localStorage)).toBe(7);
  });

  it("falls back to the default on corrupt or foreign-shaped storage", () => {
    localStorage.setItem(KP_THRESHOLD_STORAGE_KEY, "not json");
    expect(loadKpThreshold(localStorage)).toBe(5);
    localStorage.setItem(KP_THRESHOLD_STORAGE_KEY, JSON.stringify({ v: 1 }));
    expect(loadKpThreshold(localStorage)).toBe(5);
    localStorage.setItem(
      KP_THRESHOLD_STORAGE_KEY,
      JSON.stringify({ kp: 7, v: 99 }),
    );
    expect(loadKpThreshold(localStorage)).toBe(5);
  });

  it("clamps out-of-range stored values to 1–9", () => {
    saveKpThreshold(localStorage, 0);
    expect(loadKpThreshold(localStorage)).toBe(1);
    saveKpThreshold(localStorage, 12);
    expect(loadKpThreshold(localStorage)).toBe(9);
  });

  it("labels the threshold with its G scale when it maps to G1–G5", () => {
    expect(gLabelForThreshold(5)).toBe("G1");
    expect(gLabelForThreshold(6)).toBe("G2");
    expect(gLabelForThreshold(9)).toBe("G5");
    expect(gLabelForThreshold(4)).toBeNull();
    expect(gLabelForThreshold(1)).toBeNull();
  });

  it("maps Kp to the G scale as kp minus 4 (G1 at Kp 5, G5 at Kp 9)", () => {
    expect(gScaleForKp(5)).toBe(1);
    expect(gScaleForKp(9)).toBe(5);
    expect(gScaleForKp(4)).toBe(0);
  });
});