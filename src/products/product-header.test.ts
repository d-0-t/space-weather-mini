import { describe, expect, it } from "vitest";
import { matchPreparedBy, parseIssuedDate } from "./product-header";

describe("parseIssuedDate", () => {
  it("parses the year-first UTC format", () => {
    expect(parseIssuedDate("2026 Aug 23 1230 UTC")).toEqual(
      new Date(Date.UTC(2026, 7, 23, 12, 30))
    );
  });

  it("parses the time-first UTC format", () => {
    expect(parseIssuedDate("1830 UT 23 Aug 2026")).toEqual(
      new Date(Date.UTC(2026, 7, 23, 18, 30))
    );
  });

  it("throws a descriptive error on an unexpected format", () => {
    expect(() => parseIssuedDate("2026-08-23")).toThrow(/unexpected issued format/);
  });
});

describe("matchPreparedBy", () => {
  it("matches the author line with a single space after the hash", () => {
    expect(
      matchPreparedBy("# Prepared by the U.S. Dept. of Commerce, NOAA, Space Weather Prediction Center")
    ).toBe("Prepared by the U.S. Dept. of Commerce, NOAA, Space Weather Prediction Center");
  });

  it("matches the author line with extra spaces after the hash", () => {
    expect(
      matchPreparedBy("#  Prepared by the U.S. Dept. of Commerce, NOAA, Space Weather Prediction Center")
    ).toBe("Prepared by the U.S. Dept. of Commerce, NOAA, Space Weather Prediction Center");
  });

  it("returns null for other comment lines", () => {
    expect(matchPreparedBy("# Product description and SWPC contact on the Web")).toBeNull();
    expect(matchPreparedBy("#")).toBeNull();
  });
});