import { beforeEach, describe, expect, it } from "vitest";

import {
  HIDDEN_WEBCAMS_STORAGE_KEY,
  WEBCAM_FILTER_STORAGE_KEY,
  loadFilteredRegions,
  loadHiddenSourceIds,
  saveFilteredRegions,
  saveHiddenSourceIds,
} from "./webcam-storage";

describe("Webcam preferences storage (ticket 02)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns no hidden sources when nothing is stored", () => {
    expect(loadHiddenSourceIds(localStorage)).toEqual([]);
  });

  it("round-trips hidden source ids as a versioned array", () => {
    saveHiddenSourceIds(localStorage, ["uec-tromso", "auroramax"]);
    expect(localStorage.getItem(HIDDEN_WEBCAMS_STORAGE_KEY)).toBe(
      JSON.stringify(["uec-tromso", "auroramax"]),
    );
    expect(loadHiddenSourceIds(localStorage)).toEqual([
      "uec-tromso",
      "auroramax",
    ]);
  });

  it("drops duplicates and non-string junk from the hidden set", () => {
    saveHiddenSourceIds(localStorage, ["uec-tromso", "uec-tromso"]);
    expect(loadHiddenSourceIds(localStorage)).toEqual(["uec-tromso"]);
    localStorage.setItem(
      HIDDEN_WEBCAMS_STORAGE_KEY,
      JSON.stringify(["uec-tromso", 42, null]),
    );
    expect(loadHiddenSourceIds(localStorage)).toEqual(["uec-tromso"]);
  });

  it("falls back to an empty hidden set on corrupt storage", () => {
    localStorage.setItem(HIDDEN_WEBCAMS_STORAGE_KEY, "not json");
    expect(loadHiddenSourceIds(localStorage)).toEqual([]);
    localStorage.setItem(
      HIDDEN_WEBCAMS_STORAGE_KEY,
      JSON.stringify({ v: 1, ids: ["uec-tromso"] }),
    );
    expect(loadHiddenSourceIds(localStorage)).toEqual([]);
  });

  it("returns no filtered regions when nothing is stored", () => {
    expect(loadFilteredRegions(localStorage)).toEqual([]);
  });

  it("round-trips the applied region filter as a versioned value", () => {
    saveFilteredRegions(localStorage, ["Scandinavia", "Canada"]);
    expect(localStorage.getItem(WEBCAM_FILTER_STORAGE_KEY)).toBe(
      JSON.stringify({ v: 1, regions: ["Scandinavia", "Canada"] }),
    );
    expect(loadFilteredRegions(localStorage)).toEqual([
      "Scandinavia",
      "Canada",
    ]);
  });

  it("falls back to no filter on corrupt, foreign-shaped, or unknown-version storage", () => {
    localStorage.setItem(WEBCAM_FILTER_STORAGE_KEY, "not json");
    expect(loadFilteredRegions(localStorage)).toEqual([]);
    localStorage.setItem(WEBCAM_FILTER_STORAGE_KEY, JSON.stringify({ v: 1 }));
    expect(loadFilteredRegions(localStorage)).toEqual([]);
    localStorage.setItem(
      WEBCAM_FILTER_STORAGE_KEY,
      JSON.stringify({ v: 99, regions: ["Canada"] }),
    );
    expect(loadFilteredRegions(localStorage)).toEqual([]);
  });

  it("keeps only known regions from stored filter values", () => {
    localStorage.setItem(
      WEBCAM_FILTER_STORAGE_KEY,
      JSON.stringify({ v: 1, regions: ["Canada", "Atlantis"] }),
    );
    expect(loadFilteredRegions(localStorage)).toEqual(["Canada"]);
  });
});