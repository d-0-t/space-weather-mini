import { describe, expect, it } from "vitest";

import {
  VIEW_DISTANCE_THRESHOLD_STORAGE_KEY,
  distanceToNearestAurora,
  loadViewDistanceThreshold,
  saveViewDistanceThreshold,
} from "./view-distance";
import type { OvationCell } from "./ovation";

/** Builds one grid cell for a synthetic Oval grid. */
const cell = (longitude: number, latitude: number, aurora: number): OvationCell => ({
  longitude,
  latitude,
  aurora,
});

/** Kiruna, Sweden – a real chaser town far enough north for the oval. */
const KIRUNA = { latitude: 67.8558, longitude: 20.2253 };

describe("distanceToNearestAurora", () => {
  it("finds the nearest qualifying cell and reports the Likely band", () => {
    // One degree of latitude spans 2π·6371/360 ≈ 111.19 km, so a cell half a
    // degree north sits ≈ 55.6 km away – inside Nearby (0-100 km).
    const result = distanceToNearestAurora(KIRUNA, [
      cell(20.2253, 68.3558, 12),
    ]);
    expect(result.band).toBe("nearby");
    expect(result.confidence).toBe("Likely");
    expect(result.distanceKm).toBeCloseTo(55.6, 0);
  });

  it("ignores transparent 0 cells and cells below the threshold", () => {
    // A near `0` cell (no forecast) and a near sub-threshold cell must not
    // win over the 2-degree (≈222 km, Distant) qualifying cell.
    const result = distanceToNearestAurora(KIRUNA, [
      cell(20.2253, 68.1558, 0),
      cell(20.2253, 68.1058, 5),
      cell(20.2253, 69.8558, 8),
    ]);
    expect(result.band).toBe("distant");
    expect(result.confidence).toBe("Possible");
    expect(result.distanceKm).toBeCloseTo(222.4, 0);
  });

  it("reports Not in range past 600 km and for an empty grid", () => {
    // Six degrees of latitude ≈ 667 km – beyond the 600 km range.
    const outOfRange = distanceToNearestAurora(KIRUNA, [
      cell(20.2253, 73.8558, 12),
    ]);
    expect(outOfRange.band).toBe("not-in-range");
    expect(outOfRange.confidence).toBe("Not in range");
    expect(outOfRange.distanceKm).toBeNull();

    const empty = distanceToNearestAurora(KIRUNA, []);
    expect(empty.band).toBe("not-in-range");
    expect(empty.distanceKm).toBeNull();
  });

  it("ignores the OVATION boundary artifact rows", () => {
    // Lat 0, -1, 90 and -90 are model artifacts the painted map clips
    // (OvalGlow counts exclude them). A place near the equator has a
    // qualifying artifact row ~166 km away and a real qualifying cell at
    // ~222 km; the artifact must be ignored so the band stays Distant.
    const result = distanceToNearestAurora(
      { latitude: 1.5, longitude: 20.2253 },
      [
        cell(20.2253, 0, 20),
        cell(20.2253, -1, 20),
        cell(20.2253, 3.5, 8),
      ],
    );
    expect(result.band).toBe("distant");
    expect(result.distanceKm).toBeCloseTo(222.4, 0);
  });

  it("maps the band table edges: ~111 km Distant, ~334 km Far", () => {
    // 1 degree ≈ 111.2 km is past the Nearby edge (0-100 km); 3 degrees
    // ≈ 333.6 km is past the Distant edge (100-300 km) into Far.
    const oneDegree = distanceToNearestAurora(KIRUNA, [
      cell(20.2253, 68.8558, 12),
    ]);
    expect(oneDegree.band).toBe("distant");
    expect(oneDegree.confidence).toBe("Possible");

    const threeDegrees = distanceToNearestAurora(KIRUNA, [
      cell(20.2253, 70.8558, 12),
    ]);
    expect(threeDegrees.band).toBe("far");
    expect(threeDegrees.confidence).toBe("Unlikely");
  });

  it("honors a custom threshold and a custom max range", () => {
    // Threshold 10 ignores the near Aurora 8 cell; maxKm 300 keeps the
    // 2-degree cell in range while the 3-degree cell stays out.
    const result = distanceToNearestAurora(
      KIRUNA,
      [
        cell(20.2253, 68.3558, 8),
        cell(20.2253, 69.8558, 12),
        cell(20.2253, 70.8558, 20),
      ],
      10,
      300,
    );
    expect(result.band).toBe("distant");
    expect(result.distanceKm).toBeCloseTo(222.4, 0);
  });
});

describe("view distance threshold storage", () => {
  /** In-memory stand-in for localStorage, per the thresholds.ts pattern. */
  const fakeStorage = (raw: string | null) => {
    const store = new Map<string, string>();
    if (raw !== null) store.set(VIEW_DISTANCE_THRESHOLD_STORAGE_KEY, raw);
    return {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    };
  };

  it("defaults to 6 when nothing, garbage or a foreign version is stored", () => {
    expect(loadViewDistanceThreshold(fakeStorage(null))).toBe(6);
    expect(loadViewDistanceThreshold(fakeStorage("not json"))).toBe(6);
    expect(
      loadViewDistanceThreshold(fakeStorage(JSON.stringify({ threshold: 8 }))),
    ).toBe(6);
    expect(
      loadViewDistanceThreshold(
        fakeStorage(JSON.stringify({ threshold: 8, v: 2 })),
      ),
    ).toBe(6);
  });

  it("round-trips a saved threshold and clamps it to 1-25", () => {
    const storage = fakeStorage(null);
    saveViewDistanceThreshold(storage, 10);
    expect(loadViewDistanceThreshold(storage)).toBe(10);

    saveViewDistanceThreshold(storage, 0);
    expect(loadViewDistanceThreshold(storage)).toBe(1);
    saveViewDistanceThreshold(storage, 99);
    expect(loadViewDistanceThreshold(storage)).toBe(25);
  });
});
