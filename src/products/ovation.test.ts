import { describe, expect, it } from "vitest";
import {
  OVATION_LIVE,
  OVATION_QUERY_KEY,
  OVATION_REFETCH_IN_BACKGROUND,
  OVATION_REFETCH_INTERVAL_MS,
  OVATION_STALE_TIME_MS,
  OVATION_URL,
  auroraBand,
  parseOvation,
} from "./ovation";
import fixture from "./fixtures/ovation_aurora_latest.json?raw";

/** Builds a minimal OVATION payload string for edge cases (mirrors live keys). */
function makeOvationJson(
  coordinates: unknown,
  overrides: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    "Observation Time": "2026-09-04T13:20:00Z",
    "Forecast Time": "2026-09-04T14:33:00Z",
    "Data Format": "[Longitude, Latitude, Aurora]",
    coordinates,
    ...overrides,
  });
}

describe("parseOvation", () => {
  it("parses the observation and forecast times from the live fixture", () => {
    const oval = parseOvation(fixture);
    expect(oval.observationTime).toBe("2026-09-04T13:20:00Z");
    expect(oval.forecastTime).toBe("2026-09-04T14:33:00Z");
  });

  it("parses the full 1-degree grid with typed numeric rows", () => {
    const oval = parseOvation(fixture);
    expect(oval.coordinates).toHaveLength(65160);
    expect(oval.coordinates[0]).toEqual({ longitude: 0, latitude: -90, aurora: 3 });
    // Spot-check honest geography: Tromsø (18E 69N) carries a faint 1 in this quiet sample.
    expect(
      oval.coordinates.find((cell) => cell.longitude === 18 && cell.latitude === 69),
    ).toEqual({ longitude: 18, latitude: 69, aurora: 1 });
    const values = oval.coordinates.map((cell) => cell.aurora);
    expect(Math.max(...values)).toBe(14);
    expect(values.filter((v) => v === 0)).toHaveLength(49057);
  });

  it("maps Aurora intensity to the starting bands", () => {
    expect(auroraBand(0)).toBe("none");
    expect(auroraBand(1)).toBe("faint");
    expect(auroraBand(5)).toBe("faint");
    expect(auroraBand(6)).toBe("moderate");
    expect(auroraBand(10)).toBe("moderate");
    expect(auroraBand(11)).toBe("strong");
    expect(auroraBand(15)).toBe("strong");
    expect(auroraBand(16)).toBe("intense");
    expect(auroraBand(25)).toBe("intense");
    expect(auroraBand(50)).toBe("intense");
  });

  it("handles an empty grid without throwing", () => {
    expect(parseOvation(makeOvationJson([])).coordinates).toEqual([]);
  });

  it("handles an all-zero grid without throwing", () => {
    const allZero = makeOvationJson([
      [0, -90, 0],
      [1, -90, 0],
    ]);
    const oval = parseOvation(allZero);
    expect(oval.coordinates).toHaveLength(2);
    expect(oval.coordinates.every((cell) => auroraBand(cell.aurora) === "none")).toBe(true);
  });

  it("handles a single intense cell and a synthetic storm grid", () => {
    const single = makeOvationJson([[18, 69, 25]]);
    const singleOval = parseOvation(single);
    expect(singleOval.coordinates).toEqual([{ longitude: 18, latitude: 69, aurora: 25 }]);
    expect(auroraBand(singleOval.coordinates[0].aurora)).toBe("intense");

    const storm = makeOvationJson([
      [0, 70, 50],
      [1, 70, 0],
    ]);
    const stormOval = parseOvation(storm);
    expect(Math.max(...stormOval.coordinates.map((cell) => cell.aurora))).toBe(50);
    expect(auroraBand(50)).toBe("intense");
  });

  it("throws a format-changed error on invalid JSON", () => {
    expect(() => parseOvation("not json")).toThrow(/NOAA format may have changed/);
  });

  it("throws a format-changed error when the Data Format changes", () => {
    const malformed = makeOvationJson([[0, -90, 3]], { "Data Format": "[Lon, Lat]" });
    expect(() => parseOvation(malformed)).toThrow(/NOAA format may have changed/);
  });

  it("throws a format-changed error when a time stamp is missing", () => {
    const missing = JSON.stringify({
      "Data Format": "[Longitude, Latitude, Aurora]",
      coordinates: [[0, -90, 3]],
    });
    expect(() => parseOvation(missing)).toThrow(/NOAA format may have changed/);
  });

  it("throws a format-changed error when a grid row is not numeric", () => {
    const badRow = makeOvationJson([[0, -90, "high"]]);
    expect(() => parseOvation(badRow)).toThrow(/NOAA format may have changed/);
  });
});

describe("ovation query config", () => {
  it("exposes the live OVATION URL and query key for the canvas", () => {
    expect(OVATION_URL).toBe("https://services.swpc.noaa.gov/json/ovation_aurora_latest.json");
    expect(OVATION_QUERY_KEY).toEqual(["ovation", "live"]);
    expect(OVATION_LIVE).toBe(true);
  });

  it("polls every 5 minutes without background refetch and a 60s stale time", () => {
    expect(OVATION_REFETCH_INTERVAL_MS).toBe(5 * 60 * 1000);
    expect(OVATION_REFETCH_IN_BACKGROUND).toBe(false);
    expect(OVATION_STALE_TIME_MS).toBe(60 * 1000);
  });
});
