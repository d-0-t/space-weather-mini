import { describe, expect, it } from "vitest";
import {
  largestK,
  parseDailyGeomagneticIndices,
} from "./daily-geomagnetic-indices";
import fixture from "./fixtures/daily-geomagnetic-indices.txt?raw";

describe("parseDailyGeomagneticIndices", () => {
  it("parses the issued timestamp and the author from the NOAA fixture", () => {
    const indices = parseDailyGeomagneticIndices(fixture);
    expect(indices.issued).toBe("1830 UT 23 Aug 2026");
    expect(indices.author).toBe(
      "Prepared by the U.S. Dept. of Commerce, NOAA, Space Weather Prediction Center"
    );
  });

  it("parses all 30 rows with typed per-station models", () => {
    const indices = parseDailyGeomagneticIndices(fixture);
    expect(indices.rows).toHaveLength(30);
    expect(indices.rows[0]).toEqual({
      date: "2026 07 25",
      fredericksburg: { aIndex: 6, kIndices: [1, 0, 1, 3, 2, 2, 1, 2] },
      college: { aIndex: 6, kIndices: [1, 1, 1, 3, 2, 2, 1, 1] },
      planetary: { aIndex: 5, kIndices: [1.0, 0.67, 1.0, 2.0, 1.33, 2.0, 2.0, 1.67] },
    });
  });

  it("parses the partial final row with -1 placeholders and glued negative K values", () => {
    const indices = parseDailyGeomagneticIndices(fixture);
    const last = indices.rows[29];
    expect(last.date).toBe("2026 08 23");
    expect(last.fredericksburg.aIndex).toBe(-1);
    expect(last.fredericksburg.kIndices).toEqual([0, 2, 2, 2, 3, 0, -1, -1]);
    expect(last.college.kIndices).toEqual([1, 1, 3, 2, 1, 1, -1, -1]);
    expect(last.planetary.kIndices).toEqual([0.67, 2.0, 1.67, 2.0, 2.0, 0.67, -1.0, -1.0]);
  });

  it("throws a descriptive error when no data rows are found", () => {
    expect(() => parseDailyGeomagneticIndices(":Product: nothing here\n# comments\n")).toThrow(
      /no data rows/
    );
  });

  it("throws a descriptive error when the issued line is missing", () => {
    const rowsOnly = fixture.split("\n").filter((l) => /^\d{4} \d{2} \d{2}/.test(l)).join("\n");
    expect(() => parseDailyGeomagneticIndices(rowsOnly)).toThrow(/no :Issued: line/);
  });
});

describe("largestK", () => {
  it("returns the largest Kp index of the day for a station", () => {
    expect(largestK({ aIndex: 6, kIndices: [1, 0, 1, 3, 2, 2, 1, 2] })).toBe(3);
    expect(largestK({ aIndex: -1, kIndices: [0, 2, 2, 2, 3, 0, -1, -1] })).toBe(3);
  });
});