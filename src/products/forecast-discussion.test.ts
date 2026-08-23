import { describe, expect, it } from "vitest";
import { parseForecastDiscussion } from "./forecast-discussion";
import fixture from "./fixtures/forecast-discussion.txt?raw";

describe("parseForecastDiscussion", () => {
  it("parses the issued timestamp and the author from the NOAA fixture", () => {
    const discussion = parseForecastDiscussion(fixture);
    expect(discussion.issued).toBe("2026 Aug 23 1230 UTC");
    expect(discussion.author).toBe(
      "Prepared by the U.S. Dept. of Commerce, NOAA, Space Weather Prediction Center"
    );
  });

  it("parses the four sections with typed summary and forecast prose", () => {
    const discussion = parseForecastDiscussion(fixture);
    expect(discussion.solarActivity.forecast).toBe(
      "Solar activity is expected to be at low levels, with a chance for\nM-flares (R1-R2/Minor-Moderate) and a slight chance for an X-flare\n(R3/Strong or greater) over 23-25 Aug."
    );
    expect(discussion.energeticParticle.daySummary).toBe(
      "The greater than 2 MeV electron flux reached high levels. The greater\nthan 10 MeV proton flux remained elevated, ranging from 2-5 pfu\nthroughout the period."
    );
    expect(discussion.solarWind.forecast).toBe(
      "Background solar wind conditions are expected to prevail over 23-25 Aug."
    );
    expect(discussion.geospace.daySummary).toBe(
      "The geomagnetic field was at quiet levels under an ambient solar wind\nenvironment."
    );
  });

  it("preserves the source line breaks and paragraph breaks of the summary prose", () => {
    const { solarActivity } = parseForecastDiscussion(fixture);
    expect(solarActivity.daySummary).toBe(
      "Solar activity remained at low levels. Region 4513 (N04E32,\nEai/beta-gamma) produced multiple C-flares, the largest being a C4.1/Sf\nat 23/0653 UTC, and remained stable throughout the period. Region 4517\n(N10E18, Cao/beta) exhibited minor growth, while Regions 4508 (N08,\nL=166) and 4511 (S09, L=148) decayed to plage.\n\nOther activity included an area of coronal dimming near S20E04 at\n22/2030 UTC, but no associated CME was detected in coronagraph imagery.\nAt around 22/0030 UTC, a filament lifted off near N40E45, and produced a\nnarrow CME that is well north of the Sun-Earth line. No Earth-directed\nCMEs were detected in available coronagraph imagery."
    );
  });

  it("throws a descriptive error when a section is missing", () => {
    const noGeospace = fixture.replace(/\nGeospace[\s\S]*$/, "");
    expect(() => parseForecastDiscussion(noGeospace)).toThrow(/missing section/);
  });

  it("throws a descriptive error when a section marker is missing", () => {
    const noForecastMarker = fixture.replace(/\.Forecast\.\.\.\n/, "");
    expect(() => parseForecastDiscussion(noForecastMarker)).toThrow(
      /no \.Forecast\.\.\. marker/
    );
  });

  it("throws a descriptive error when the issued line is missing", () => {
    const noIssued = fixture.replace(/:Issued:.*\n/, "");
    expect(() => parseForecastDiscussion(noIssued)).toThrow(/no :Issued: line/);
  });
});