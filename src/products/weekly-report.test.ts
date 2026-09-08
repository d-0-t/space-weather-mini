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
      "Solar activity ranged from very low to low levels throughout the period. No R1 (Minor) or greater events were observed. The largest flare was a C8.2/Sn at 16/1928 UTC from Region 4506 (N12, L=215, class/area=Dao/100 on 16 Aug). An associated CME was observed in LASCO C2 imagery following the C8.2 flare, but analysis is ongoing in order to determine any Earth-directed component. Other activity included the lift-off of avlarge filament near S16E22 at 14/0332 UTC which produced a CME that is expected to arrive on 17-18 Aug.\n\nNo proton events were observed at geosynchronous orbit.\n\nThe greater than 2 MeV electron flux at geosynchronous orbit was normal to moderate levels throughout the period.\n\nGeomagnetic field activity was at quiet or quiet to unsettled levels throughout the period."
    );
  });

  it("parses the Forecast section with its date range and body prose", () => {
    const report = parseWeeklyReport(fixture);
    expect(report.forecast.title).toBe(
      "Forecast of Solar and Geomagnetic Activity"
    );
    expect(report.forecast.dateRange).toBe("17 August - 12 September 2026");
    expect(report.forecast.body).toBe(
      "Solar activity is expected to range from very low to low levels throughout the outlook period, with a slight chance for an R1-R2 (Minor-Moderate) event.\n\nNo proton events are expected at geosynchronous orbit.\n\nThe greater than 2 MeV electron flux at geosynchronous orbit is expected to reach high levels on 19-20, 23-24, and 28 Aug. Normal to moderate levels are expected to prevail throughout the remainder of the outlook period.\n\nGeomagnetic field activity is expected to reach active levels on 17-18 Aug due to the anticipated arrival of a CME that left the Sun on 14 Aug. Active conditions are expected again on 21-22 Aug and 04 Sep due to the influences of a CH HSS. Quiet and quiet to unsettled conditions are expected to prevail throughout the remainder of the outlook period."
    );
  });

  it("keeps paragraph breaks, joining mid-sentence wraps into flowing sentences", () => {
    const report = parseWeeklyReport(fixture);
    expect(report.forecast.body).toContain("\n\n");
    // Mid-sentence column wraps are joined; sentences flow within a paragraph.
    expect(report.forecast.body).toContain(
      "very low to low levels throughout the outlook period"
    );
    expect(report.forecast.body).toContain(
      "28 Aug. Normal to moderate levels"
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

  it("strips stray HTML tags like <o:p> and </span> emitted by NOAA since Aug 2026", () => {
    const withTags = fixture.replace(
      "Geomagnetic field activity was at quiet or quiet to unsettled levels\nthroughout the period.",
      "Geomagnetic field activity was at quiet or quiet to unsettled levels\nthroughout the period.<o:p></o:p></span> "
    );
    const report = parseWeeklyReport(withTags);
    expect(report.highlights.body).not.toContain("<o:p>");
    expect(report.highlights.body).not.toContain("</span>");
    expect(report.highlights.body).not.toContain("<");
    // still contains the original prose
    expect(report.highlights.body).toContain(
      "Geomagnetic field activity was at quiet"
    );
  });

  it("parses live Aug 2026 weekly with tagged highlights (regression for reported highlight bug)", () => {
    const live = `:Product: Weekly Highlights and Forecasts
:Issued: 2026 Aug 24 1801 UTC
# Prepared by the US Dept. of Commerce, NOAA, Space Weather Prediction Center
#
#                Weekly Highlights and Forecasts
#
Highlights of Solar and Geomagnetic Activity
17 - 23 August 2026

Solar activity reached moderate levels on 19, 20 and 21 Aug and was
at low levels on 17, 18, 22, and 23 Aug. Region 4513 (N04, L=50,
class/area Ekc/260 on 22 Aug) was the main contributor.<o:p></o:p></span> 

Forecast of Solar and Geomagnetic Activity
24 August - 19 September 2026

Solar activity is expected to be at low levels.
`;
    const report = parseWeeklyReport(live);
    expect(report.highlights.dateRange).toBe("17 - 23 August 2026");
    expect(report.highlights.body).not.toContain("<o:p>");
    expect(report.highlights.body).toContain("Solar activity reached moderate");
  });
});
