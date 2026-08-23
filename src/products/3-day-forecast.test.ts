import { describe, expect, it } from "vitest";
import { parseThreeDayForecast } from "./3-day-forecast";
import fixture from "./fixtures/3-day-forecast.txt?raw";

describe("parseThreeDayForecast", () => {
  it("parses the issued timestamp from the NOAA fixture", () => {
    const forecast = parseThreeDayForecast(fixture);
    expect(forecast.issued).toBe("2026 Aug 23 1230 UTC");
  });

  it("parses the three forecast days", () => {
    const forecast = parseThreeDayForecast(fixture);
    expect(forecast.days).toEqual(["Aug 23", "Aug 24", "Aug 25"]);
  });

  it("parses the geomagnetic activity section with details, rationale and the Kp breakdown", () => {
    const { geomagneticActivity } = parseThreeDayForecast(fixture);
    expect(geomagneticActivity.details).toEqual([
      "The greatest observed 3 hr Kp over the past 24 hours was 2 (below NOAA Scale levels). The greatest expected 3 hr Kp for Aug 23-Aug 25 2026 is 2.00 (below NOAA Scale levels).",
    ]);
    expect(geomagneticActivity.rationale).toBe(
      "No G1 (Minor) or greater geomagnetic storms are expected. No significant transient or recurrent solar wind features are forecast."
    );
    expect(geomagneticActivity.kpBreakdown).toHaveLength(8);
    expect(geomagneticActivity.kpBreakdown[0]).toEqual({
      timeSlot: "00-03UT",
      days: [0.67, 1.67, 1.67],
    });
    expect(geomagneticActivity.kpBreakdown[7]).toEqual({
      timeSlot: "21-00UT",
      days: [1.67, 1.67, 1.33],
    });
  });

  it("parses the solar radiation storm section with its S1 or greater probability row", () => {
    const { solarRadiationStorm } = parseThreeDayForecast(fixture);
    expect(solarRadiationStorm.details).toEqual([
      "Solar radiation, as observed by NOAA GOES-18 over the past 24 hours, was below S-scale storm level thresholds.",
    ]);
    expect(solarRadiationStorm.rationale).toBe(
      "There is a chance for the greater than 10 MeV proton flux to reach S1 (Minor) levels on 23 Aug, and a slight chance on 24-25 Aug."
    );
    expect(solarRadiationStorm.probabilities).toEqual([
      { label: "S1 or greater", days: [25, 10, 10] },
    ]);
  });

  it("parses the radio blackout section with R1-R2 and R3 or greater probability rows", () => {
    const { radioBlackout } = parseThreeDayForecast(fixture);
    expect(radioBlackout.details).toEqual([
      "No radio blackouts were observed over the past 24 hours.",
    ]);
    expect(radioBlackout.rationale).toBe(
      "There is a chance for R1-R2 (Minor-Moderate) radio blackouts, and a slight chance for an R3 (Strong) or greater event, over 23-25 Aug."
    );
    expect(radioBlackout.probabilities).toEqual([
      { label: "R1-R2", days: [45, 45, 45] },
      { label: "R3 or greater", days: [10, 10, 10] },
    ]);
  });

  it("throws a descriptive error when the issued line is missing", () => {
    const noIssued = fixture.replace(/:Issued:.*\n/, "");
    expect(() => parseThreeDayForecast(noIssued)).toThrow(/no :Issued: line/);
  });

  it("throws a descriptive error when a section is missing", () => {
    const twoSections = fixture.replace(/C\. NOAA[\s\S]*$/, "");
    expect(() => parseThreeDayForecast(twoSections)).toThrow(/expected 3 sections/);
  });
});