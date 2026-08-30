import { beforeEach, describe, expect, it } from "vitest";

import {
  AUTO_REFRESH_STORAGE_KEY,
  HIDDEN_WEBCAMS_STORAGE_KEY,
  WEBCAM_FILTER_STORAGE_KEY,
  WEBCAM_PANELS_STORAGE_KEY,
  loadAutoRefresh,
  loadClosedPanels,
  loadFilteredRegions,
  loadHiddenSourceIds,
  saveAutoRefresh,
  saveClosedPanels,
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
    saveFilteredRegions(localStorage, ["Nordic", "North America"]);
    expect(localStorage.getItem(WEBCAM_FILTER_STORAGE_KEY)).toBe(
      JSON.stringify({ v: 1, regions: ["Nordic", "North America"] }),
    );
    expect(loadFilteredRegions(localStorage)).toEqual([
      "Nordic",
      "North America",
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
      JSON.stringify({ v: 1, regions: ["North America", "Atlantis"] }),
    );
    expect(loadFilteredRegions(localStorage)).toEqual(["North America"]);
  });
});

describe("Webcam panel persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns no closed panels when nothing is stored", () => {
    expect(loadClosedPanels(localStorage)).toEqual([]);
  });

  it("round-trips the collapsed section ids as a versioned array", () => {
    saveClosedPanels(localStorage, ["webcams-region-Nordic", "webcams-links"]);
    expect(localStorage.getItem(WEBCAM_PANELS_STORAGE_KEY)).toBe(
      JSON.stringify({
        v: 1,
        closed: ["webcams-region-Nordic", "webcams-links"],
      }),
    );
    expect(loadClosedPanels(localStorage)).toEqual([
      "webcams-region-Nordic",
      "webcams-links",
    ]);
  });

  it("falls back to no closed panels on corrupt, foreign-shaped, or unknown-version storage", () => {
    localStorage.setItem(WEBCAM_PANELS_STORAGE_KEY, "not json");
    expect(loadClosedPanels(localStorage)).toEqual([]);
    localStorage.setItem(WEBCAM_PANELS_STORAGE_KEY, JSON.stringify({ v: 1 }));
    expect(loadClosedPanels(localStorage)).toEqual([]);
    localStorage.setItem(
      WEBCAM_PANELS_STORAGE_KEY,
      JSON.stringify({ v: 99, closed: ["webcams-region-Nordic"] }),
    );
    expect(loadClosedPanels(localStorage)).toEqual([]);
  });

  it("drops non-string junk from the closed panel ids", () => {
    localStorage.setItem(
      WEBCAM_PANELS_STORAGE_KEY,
      JSON.stringify({ v: 1, closed: ["webcams-links", 42, null] }),
    );
    expect(loadClosedPanels(localStorage)).toEqual(["webcams-links"]);
  });
});

describe("Webcam auto-refresh preference (ticket 03)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults auto-refresh to off when nothing is stored", () => {
    expect(loadAutoRefresh(localStorage)).toBe(false);
  });

  it("round-trips the auto-refresh setting as a versioned boolean", () => {
    saveAutoRefresh(localStorage, true);
    expect(localStorage.getItem(AUTO_REFRESH_STORAGE_KEY)).toBe("true");
    expect(loadAutoRefresh(localStorage)).toBe(true);
    saveAutoRefresh(localStorage, false);
    expect(loadAutoRefresh(localStorage)).toBe(false);
  });

  it("falls back to off on corrupt or foreign-shaped storage", () => {
    localStorage.setItem(AUTO_REFRESH_STORAGE_KEY, "not json");
    expect(loadAutoRefresh(localStorage)).toBe(false);
    localStorage.setItem(
      AUTO_REFRESH_STORAGE_KEY,
      JSON.stringify({ v: 1, enabled: true }),
    );
    expect(loadAutoRefresh(localStorage)).toBe(false);
    localStorage.setItem(AUTO_REFRESH_STORAGE_KEY, JSON.stringify(1));
    expect(loadAutoRefresh(localStorage)).toBe(false);
  });
});