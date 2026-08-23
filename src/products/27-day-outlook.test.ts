import { describe, expect, it } from "vitest";
import { parse27DayOutlook } from "./27-day-outlook";
import fixture from "./fixtures/27-day-outlook.txt?raw";

describe("parse27DayOutlook", () => {
  it("parses the issued timestamp and the author from the NOAA fixture", () => {
    const outlook = parse27DayOutlook(fixture);
    expect(outlook.issued).toBe("2026 Aug 17 0058 UTC");
    expect(outlook.author).toBe(
      "Prepared by the US Dept. of Commerce, NOAA, Space Weather Prediction Center"
    );
  });

  it("parses all 27 data rows with typed numeric values", () => {
    const outlook = parse27DayOutlook(fixture);
    expect(outlook.rows).toHaveLength(27);
    expect(outlook.rows[0]).toEqual({ date: "2026 Aug 17", radioFlux: 130, aIndex: 15, kpIndex: 4 });
    expect(outlook.rows[26]).toEqual({ date: "2026 Sep 12", radioFlux: 105, aIndex: 5, kpIndex: 2 });
    expect(outlook.rows[9]).toEqual({ date: "2026 Aug 26", radioFlux: 110, aIndex: 5, kpIndex: 2 });
  });

  it("ignores header, comment, and blank lines", () => {
    const outlook = parse27DayOutlook(fixture);
    for (const row of outlook.rows) {
      expect(row.date).toMatch(/^\d{4} \w{3} \d{2}$/);
    }
  });

  it("throws a descriptive error when no data rows are found", () => {
    const headerOnly =
      ":Product: 27-day Space Weather Outlook Table 27DO.txt\n" +
      ":Issued: 2026 Aug 17 0058 UTC\n" +
      "# Prepared by the US Dept. of Commerce, NOAA, Space Weather Prediction Center\n" +
      "# just comments\n";
    expect(() => parse27DayOutlook(headerOnly)).toThrow(/no data rows/);
  });

  it("throws a descriptive error when the issued line is missing", () => {
    const rowsOnly = fixture.split("\n").filter((l) => /^\d{4} \w{3} \d{2}/.test(l)).join("\n");
    expect(() => parse27DayOutlook(rowsOnly)).toThrow(/no :Issued: line/);
  });
});