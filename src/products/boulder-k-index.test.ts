import { describe, expect, it } from "vitest";
import { parseBoulderKIndex } from "./boulder-k-index";
import fixture from "./fixtures/boulder-k-index-1m.json?raw";

describe("parseBoulderKIndex", () => {
  it("parses k_index with time_tag, sorting oldest-first", () => {
    const points = parseBoulderKIndex(fixture);
    expect(points.length).toBeGreaterThan(5);
    expect(points[0].time_tag < points[points.length - 1].time_tag).toBe(true);
    for (const point of points) {
      expect(point.time_tag).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(typeof point.k_index).toBe("number");
    }
  });

  it("maps -9999 flag values to null", () => {
    const text = JSON.stringify([
      { time_tag: "2026-08-26T22:00:00", k_index: -9999 },
      { time_tag: "2026-08-26T22:01:00", k_index: 2.4 },
    ]);
    expect(parseBoulderKIndex(text)).toEqual([
      { time_tag: "2026-08-26T22:00:00", k_index: null },
      { time_tag: "2026-08-26T22:01:00", k_index: 2.4 },
    ]);
  });

  it("throws when shape changes", () => {
    expect(() => parseBoulderKIndex("{}")).toThrow(/parseBoulderKIndex/i);
    expect(() => parseBoulderKIndex("not json")).toThrow(/parseBoulderKIndex/i);
    expect(() => parseBoulderKIndex(JSON.stringify([{ time_tag: "x" }]))).not.toThrow();
    expect(() => parseBoulderKIndex(JSON.stringify([{ k_index: 1 }]))).toThrow(/parseBoulderKIndex/i);
  });
});