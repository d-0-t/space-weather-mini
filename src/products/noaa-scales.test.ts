import { describe, expect, it } from "vitest";
import { parseNoaaScales } from "./noaa-scales";
import fixture from "./fixtures/noaa-scales.json?raw";

describe("parseNoaaScales", () => {
  it("parses current, day1-3 and yesterday scales with issued passthrough", () => {
    const scales = parseNoaaScales(fixture);
    // Current G scale 0 none
    expect(scales.current.G.Scale).toBe("0");
    expect(scales.current.G.Text).toBe("none");
    // Yesterday R scale 2 moderate
    expect(scales.yesterday.R.Scale).toBe("2");
    expect(scales.yesterday.R.Text).toBe("moderate");
    // Day1 G scale 0 none, R probs 55/15
    expect(scales.day1.G.Scale).toBe("0");
    expect(scales.day1.R.MinorProb).toBe("55");
    expect(scales.day1.R.MajorProb).toBe("15");
    // Day2 and Day3 similar
    expect(scales.day2.G.Scale).toBe("0");
    expect(scales.day3.G.Scale).toBe("0");
    // Issued passthrough for freshness
    expect(scales.issued).toBe("2026-08-25 17:49:00");
  });

  it("handles empty scale '0' and null probs without throwing", () => {
    const scales = parseNoaaScales(fixture);
    expect(scales.current.R.Scale).toBe("0");
    expect(scales.current.S.Prob).toBe(null);
    expect(scales.day1.R.Scale).toBe(null);
  });

  it("throws a descriptive error when JSON shape changes", () => {
    expect(() => parseNoaaScales("{}")).toThrow(/parseNoaaScales/i);
    expect(() => parseNoaaScales("not json")).toThrow(/parseNoaaScales/i);
    expect(() => parseNoaaScales(JSON.stringify({ "0": {} }))).toThrow(/parseNoaaScales/i);
  });

  it("throws when required day keys are missing", () => {
    const missing = JSON.stringify({ "0": { DateStamp: "2026-08-25", TimeStamp: "00:00:00", R: { Scale: "0", Text: "none" }, S: { Scale: "0", Text: "none" }, G: { Scale: "0", Text: "none" } } });
    expect(() => parseNoaaScales(missing)).toThrow(/parseNoaaScales/i);
  });
});
