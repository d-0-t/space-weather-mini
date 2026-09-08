import { describe, expect, it } from "vitest";
import { normalizeProse } from "./prose";

describe("normalizeProse", () => {
  it("joins mid-sentence line breaks into spaces", () => {
    expect(normalizeProse("was 5 (NOAA Scale\nG1).")).toBe(
      "was 5 (NOAA Scale G1)."
    );
  });

  it("keeps line breaks that follow the end of a sentence", () => {
    expect(normalizeProse("indices for 23 August follow.\nSolar flux 128.")).toBe(
      "indices for 23 August follow.\nSolar flux 128."
    );
  });

  it("keeps breaks after terminal punctuation closed by a paren", () => {
    expect(normalizeProse("was 2 (below NOAA\nScale levels).\nNext sentence.")).toBe(
      "was 2 (below NOAA Scale levels).\nNext sentence."
    );
  });

  it("does not treat commas or decimals as sentence ends", () => {
    expect(normalizeProse("Region 4506 (N12, L=215,\nclass/area=Dao/100).")).toBe(
      "Region 4506 (N12, L=215, class/area=Dao/100)."
    );
    expect(normalizeProse("is 2.00\nScale levels.")).toBe(
      "is 2.00 Scale levels."
    );
  });

  it("collapses runs of spaces inside a line", () => {
    expect(normalizeProse("storms are expected.  No\nsignificant features.")).toBe(
      "storms are expected. No significant features."
    );
  });

  it("keeps blank-line paragraph gaps as a double newline", () => {
    expect(normalizeProse("First paragraph.\n\nSecond paragraph.")).toBe(
      "First paragraph.\n\nSecond paragraph."
    );
  });

  it("drops lines that are whitespace only", () => {
    expect(normalizeProse("First paragraph.\n   \n\t\nSecond paragraph.")).toBe(
      "First paragraph.\n\nSecond paragraph."
    );
  });

  it("returns empty prose for whitespace-only input", () => {
    expect(normalizeProse("  \n\n  ")).toBe("");
  });

  it("reflows a real NOAA paragraph shape end to end", () => {
    const source =
      "The greater observed 3 hr Kp over the past 24 hours was 2 (below NOAA\n" +
      "Scale levels).\n" +
      "The greatest expected 3 hr Kp for Aug 23-Aug 25 2026 is 2.00 (below NOAA\n" +
      "Scale levels).";
    expect(normalizeProse(source)).toBe(
      "The greater observed 3 hr Kp over the past 24 hours was 2 (below NOAA Scale levels).\n" +
        "The greatest expected 3 hr Kp for Aug 23-Aug 25 2026 is 2.00 (below NOAA Scale levels)."
    );
  });
});
