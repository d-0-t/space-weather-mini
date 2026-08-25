import { describe, expect, it } from "vitest";
import { parseHemiPower } from "./hemi-power";
import fixture from "./fixtures/hemi-power.txt?raw";

describe("parseHemiPower", () => {
  it("parses the latest hemispheric power GW and time tags from fixture", () => {
    const data = parseHemiPower(fixture);
    expect(data.points.length).toBeGreaterThan(100);
    // First point
    expect(data.points[0].observationTime).toBe("2026-08-25_00:00");
    expect(data.points[0].northPowerGW).toBe(15);
    expect(data.points[0].southPowerGW).toBe(15);
    // Latest point should be near end of file
    const last = data.points[data.points.length - 1];
    expect(last.observationTime).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}:\d{2}$/);
    expect(typeof last.northPowerGW).toBe("number");
  });

  it("handles negative Dst-like? Actually power is always positive", () => {
    const data = parseHemiPower(fixture);
    for (const p of data.points) {
      expect(p.northPowerGW).toBeGreaterThanOrEqual(0);
      expect(p.southPowerGW).toBeGreaterThanOrEqual(0);
    }
  });

  it("throws when no data rows found", () => {
    const headerOnly = "# Prepared by the U.S. Dept. of Commerce, NOAA\n# just comments\n";
    expect(() => parseHemiPower(headerOnly)).toThrow(/parseHemiPower/i);
  });

  it("throws when format changes (missing columns)", () => {
    const bad = "2026-08-25_00:00    2026-08-25_01:10      bad      15\n";
    expect(() => parseHemiPower(bad)).toThrow(/parseHemiPower/i);
  });

  it("ignores comment and blank lines", () => {
    const minimal = "# comment\n\n2026-08-25_00:00    2026-08-25_01:10      15      15\n";
    const data = parseHemiPower(minimal);
    expect(data.points).toHaveLength(1);
  });
});
