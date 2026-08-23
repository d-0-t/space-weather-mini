import { describe, expect, it } from "vitest";
import { parseWeeklyReport } from "./weekly-report";
import fixture from "./fixtures/weekly-report.txt?raw";

describe("parseWeeklyReport", () => {
  it("parses the issued timestamp and the author from the NOAA fixture", () => {
    const report = parseWeeklyReport(fixture);
    expect(report.issued).toBe("2026 Aug 17 0058 UTC");
    expect(report.author).toBe(
      "Prepared by the US Dept. of Commerce, NOAA, Space Weather Prediction Center"
    );
  });

  it("parses the Highlights section with its date range and body prose", () => {
    const report = parseWeeklyReport(fixture);
    expect(report.highlights.title).toBe(
      "Highlights of Solar and Geomagnetic Activity"
    );
    expect(report.highlights.dateRange).toBe("10 - 16 August 2026");
    expect(report.highlights.body).toBe(
      "Solar activity ranged from very low to low levels throughout the\nperiod. No R1 (Minor) or greater events were observed. The largest\nflare was a C8.2/Sn at 16/1928 UTC from Region 4506 (N12, L=215,\nclass/area=Dao/100 on 16 Aug). An associated CME was observed in\nLASCO C2 imagery following the C8.2 flare, but analysis is ongoing\nin order to determine any Earth-directed component. Other activity\nincluded the lift-off of avlarge filament near S16E22 at 14/0332 UTC\nwhich produced a CME that is expected to arrive on 17-18 Aug.\n\nNo proton events were observed at geosynchronous orbit.\n\nThe greater than 2 MeV electron flux at geosynchronous orbit was\nnormal to moderate levels throughout the period.\n\nGeomagnetic field activity was at quiet or quiet to unsettled levels\nthroughout the period."
    );
  });

  it("parses the Forecast section with its date range and body prose", () => {
    const report = parseWeeklyReport(fixture);
    expect(report.forecast.title).toBe(
      "Forecast of Solar and Geomagnetic Activity"
    );
    expect(report.forecast.dateRange).toBe("17 August - 12 September 2026");
    expect(report.forecast.body).toBe(
      "Solar activity is expected to range from very low to low levels\nthroughout the outlook period, with a slight chance for an R1-R2\n(Minor-Moderate) event.\n\nNo proton events are expected at geosynchronous orbit.\n\nThe greater than 2 MeV electron flux at geosynchronous orbit is\nexpected to reach high levels on 19-20, 23-24, and 28 Aug. Normal to\nmoderate levels are expected to prevail throughout the remainder of\nthe outlook period.\n\nGeomagnetic field activity is expected to reach active levels on\n17-18 Aug due to the anticipated arrival of a CME that left the Sun\non 14 Aug. Active conditions are expected again on 21-22 Aug and 04\nSep due to the influences of a CH HSS. Quiet and quiet to unsettled\nconditions are expected to prevail throughout the remainder of the\noutlook period."
    );
  });

  it("preserves the source line breaks and blank-line paragraph breaks in the Forecast body", () => {
    const report = parseWeeklyReport(fixture);
    expect(report.forecast.body).toContain("\n\n");
    // Forecast body should keep line breaks within paragraphs
    expect(report.forecast.body).toContain(
      "Solar activity is expected to range from very low to low levels\nthroughout the outlook period"
    );
  });

  it("throws a descriptive error when the Highlights section is missing", () => {
    const noHighlights = fixture.replace(
      "Highlights of Solar and Geomagnetic Activity",
      ""
    );
    expect(() => parseWeeklyReport(noHighlights)).toThrow(/Highlights/);
  });

  it("throws a descriptive error when the Forecast section is missing", () => {
    const noForecast = fixture.replace(
      "Forecast of Solar and Geomagnetic Activity",
      ""
    );
    expect(() => parseWeeklyReport(noForecast)).toThrow(/Forecast/);
  });

  it("throws a descriptive error when the issued line is missing", () => {
    const noIssued = fixture.replace(/:Issued:.*\n/, "");
    expect(() => parseWeeklyReport(noIssued)).toThrow(/no :Issued: line/);
  });

  it("throws a descriptive error when the author line is missing", () => {
    const noAuthor = fixture.replace(/# Prepared by.*\n/, "");
    expect(() => parseWeeklyReport(noAuthor)).toThrow(/no Prepared by line/);
  });
});
