import { describe, expect, it } from "vitest";
import { parsePlanetaryKIndex, parsePlanetaryKIndexForecast } from "./noaa-planetary-k-index";
import observedFixture from "./fixtures/noaa-planetary-k-index.json?raw";
import forecastFixture from "./fixtures/noaa-planetary-k-index-forecast.json?raw";

describe("parsePlanetaryKIndex", () => {
  it("parses observed 8-day history with time_tag and Kp values", () => {
    const data = parsePlanetaryKIndex(observedFixture);
    expect(data.length).toBeGreaterThan(50);
    // Check first and last point structure
    expect(data[0]).toHaveProperty("time_tag");
    expect(data[0]).toHaveProperty("Kp");
    expect(typeof data[0].Kp).toBe("number");
    // Known value from fixture: first point Kp 4.00 at 2026-08-18
    expect(data[0].time_tag).toBe("2026-08-18T00:00:00");
    expect(data[0].Kp).toBe(4);
    // Last point should be recent
    const last = data[data.length - 1];
    expect(last.time_tag).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  });

  it("preserves a_running and station_count", () => {
    const data = parsePlanetaryKIndex(observedFixture);
    expect(data[0].a_running).toBeDefined();
    expect(data[0].station_count).toBeDefined();
  });

  it("throws when Kp point is missing required fields", () => {
    const bad = JSON.stringify([{ time_tag: "2026-08-18T00:00:00", a_running: 27 }]);
    expect(() => parsePlanetaryKIndex(bad)).toThrow(/parsePlanetaryKIndex/i);
  });

  it("throws on invalid JSON or non-array", () => {
    expect(() => parsePlanetaryKIndex("not json")).toThrow(/parsePlanetaryKIndex/i);
    expect(() => parsePlanetaryKIndex("{}")).toThrow(/parsePlanetaryKIndex/i);
    expect(() => parsePlanetaryKIndex("[]")).toThrow(/parsePlanetaryKIndex/i);
  });

  it("handles Kp edge values 0 and 9 with fractional parts", () => {
    const edge = JSON.stringify([
      { time_tag: "2026-08-18T00:00:00", Kp: 0, a_running: 0, station_count: 8 },
      { time_tag: "2026-08-18T03:00:00", Kp: 9, a_running: 48, station_count: 8 },
      { time_tag: "2026-08-18T06:00:00", Kp: 5.33, a_running: 18, station_count: 8 },
    ]);
    const data = parsePlanetaryKIndex(edge);
    expect(data[0].Kp).toBe(0);
    expect(data[1].Kp).toBe(9);
    expect(data[2].Kp).toBe(5.33);
  });
});

describe("parsePlanetaryKIndexForecast", () => {
  it("parses forecast with kp, observed status and noaa_scale G label", () => {
    const data = parsePlanetaryKIndexForecast(forecastFixture);
    expect(data.length).toBeGreaterThan(50);
    // Find a point with G1
    const g1 = data.find((p) => p.noaa_scale === "G1");
    expect(g1).toBeDefined();
    expect(g1?.kp).toBeGreaterThanOrEqual(5);
    // Check observed field
    expect(data[0].observed).toMatch(/observed|estimated|predicted/);
    // First point kp 4.00 observed
    expect(data[0].kp).toBe(4);
    expect(data[0].observed).toBe("observed");
  });

  it("throws when forecast point missing kp or time_tag", () => {
    const bad = JSON.stringify([{ time_tag: "2026-08-18T00:00:00", kp: 4 }]);
    // missing observed
    expect(() => parsePlanetaryKIndexForecast(bad)).toThrow(/parsePlanetaryKIndexForecast/i);
  });

  it("throws on invalid JSON", () => {
    expect(() => parsePlanetaryKIndexForecast("not json")).toThrow(/parsePlanetaryKIndexForecast/i);
  });

  it("preserves null noaa_scale for quiet periods", () => {
    const data = parsePlanetaryKIndexForecast(forecastFixture);
    const quiet = data.find((p) => p.noaa_scale === null);
    expect(quiet).toBeDefined();
  });
});
