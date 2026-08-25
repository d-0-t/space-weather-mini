import { describe, expect, it } from "vitest";
import { parseKyotoDst } from "./kyoto-dst";
import fixture from "./fixtures/kyoto-dst.json?raw";

describe("parseKyotoDst", () => {
  it("parses Dst points with time_tag and dst values", () => {
    const data = parseKyotoDst(fixture);
    expect(data.points.length).toBeGreaterThan(100);
    expect(data.points[0].time_tag).toBe("2026-08-18T18:00:00");
    expect(typeof data.points[0].dst).toBe("number");
    // Check negative Dst -47
    const neg = data.points.find((p) => p.dst === -47);
    expect(neg).toBeDefined();
  });

  it("preserves negative and positive Dst values", () => {
    const data = parseKyotoDst(fixture);
    const hasNegative = data.points.some((p) => p.dst < 0);
    const hasPositive = data.points.some((p) => p.dst > 0);
    expect(hasNegative).toBe(true);
    expect(hasPositive).toBe(true);
  });

  it("throws on invalid JSON or shape", () => {
    expect(() => parseKyotoDst("not json")).toThrow(/parseKyotoDst/i);
    expect(() => parseKyotoDst("{}")).toThrow(/parseKyotoDst/i);
    expect(() => parseKyotoDst(JSON.stringify([{ time_tag: "2026-08-18T18:00:00" }]))).toThrow(/parseKyotoDst/i);
  });

  it("throws on empty array", () => {
    expect(() => parseKyotoDst("[]")).toThrow(/parseKyotoDst/i);
  });
});
