import { describe, expect, it } from "vitest";
import { parseGeophysicalAlert } from "./geophysical-alert";
import fixture from "./fixtures/geophysical-alert.txt?raw";

describe("parseGeophysicalAlert", () => {
  it("parses the issued timestamp and the author from the NOAA fixture", () => {
    const alert = parseGeophysicalAlert(fixture);
    expect(alert.issued).toBe("2026 Aug 23 2105 UTC");
    expect(alert.author).toBe(
      "Prepared by the US Dept. of Commerce, NOAA, Space Weather Prediction Center"
    );
  });

  it("parses the Geophysical Alert Message (solar indices) paragraph", () => {
    const alert = parseGeophysicalAlert(fixture);
    expect(alert.message).toBe(
      "Solar-terrestrial indices for 23 August follow.\n" +
        "Solar flux 128 and estimated planetary A-index 6.\n" +
        "The estimated planetary K-index at 2100 UTC on 23 August was 1.67."
    );
  });

  it("parses the observed and predicted paragraphs preserving prose", () => {
    const alert = parseGeophysicalAlert(fixture);
    expect(alert.observed).toBe(
      "No space weather storms were observed for the past 24 hours."
    );
    expect(alert.predicted).toBe(
      "No space weather storms are predicted for the next 24 hours."
    );
  });

  it("preserves line breaks within the message paragraph", () => {
    const alert = parseGeophysicalAlert(fixture);
    expect(alert.message).toContain("\n");
    expect(alert.message).toContain("Solar flux 128");
  });

  it("throws a descriptive error when the issued line is missing", () => {
    const noIssued = fixture.replace(/:Issued:.*\n/, "");
    expect(() => parseGeophysicalAlert(noIssued)).toThrow(/no :Issued: line/);
  });

  it("throws a descriptive error when the author line is missing", () => {
    const noAuthor = fixture.replace(/# Prepared by.*\n/, "");
    expect(() => parseGeophysicalAlert(noAuthor)).toThrow(/no Prepared by line/);
  });

  it("throws a descriptive error when the observed paragraph is missing", () => {
    const noObserved = fixture.replace(
      "No space weather storms were observed for the past 24 hours.",
      ""
    );
    expect(() => parseGeophysicalAlert(noObserved)).toThrow(/observed/);
  });

  it("throws a descriptive error when the predicted paragraph is missing", () => {
    const noPredicted = fixture.replace(
      "No space weather storms are predicted for the next 24 hours.",
      ""
    );
    expect(() => parseGeophysicalAlert(noPredicted)).toThrow(/predicted/);
  });

  it("parses the new Aug 2026 observed wording without 'observed' (past 24 hours)", () => {
    const live = `:Product: Geophysical Alert Message wwv.txt
:Issued: 2026 Aug 24 2110 UTC
# Prepared by the US Dept. of Commerce, NOAA, Space Weather Prediction Center
#
#          Geophysical Alert Message
#
Solar-terrestrial indices for 24 August follow.
Solar flux 143 and estimated planetary A-index 5.
The estimated planetary K-index at 2100 UTC on 24 August was 1.33.

Space weather for the past 24 hours has been minor.
Radio blackouts reaching the R1 level occurred.

No space weather storms are predicted for the next 24 hours.
`;
    const alert = parseGeophysicalAlert(live);
    expect(alert.observed).toContain("past 24 hours");
    expect(alert.observed).toContain("Radio blackouts");
    expect(alert.predicted).toContain("predicted");
    expect(alert.message).toContain("Solar flux 143");
  });

  it("strips stray HTML tags from geophysical alert paragraphs", () => {
    const liveWithTags = `:Product: Geophysical Alert Message wwv.txt
:Issued: 2026 Aug 24 2110 UTC
# Prepared by the US Dept. of Commerce, NOAA, Space Weather Prediction Center
#
#          Geophysical Alert Message
#
Solar-terrestrial indices for 24 August follow.<o:p></o:p></span>
Solar flux 143 and estimated planetary A-index 5.

Space weather for the past 24 hours has been minor.<o:p></o:p></span>

No space weather storms are predicted for the next 24 hours.<o:p></o:p></span>
`;
    const alert = parseGeophysicalAlert(liveWithTags);
    expect(alert.message).not.toContain("<o:p>");
    expect(alert.observed).not.toContain("<");
    expect(alert.predicted).not.toContain("<");
  });
});
