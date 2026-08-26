import { describe, expect, it } from "vitest";
import {
  parseSolarWindMagField,
  parseSolarWindSpeed,
  parseRtswWind,
  parseRtswMagField,
} from "./solar-wind";
import magFixture from "./fixtures/solar-wind-mag-field.json?raw";
import speedFixture from "./fixtures/solar-wind-speed.json?raw";
import rtswWindFixture from "./fixtures/rtsw-wind-1m.json?raw";
import rtswMagFixture from "./fixtures/rtsw-mag-1m.json?raw";

describe("parseSolarWindMagField", () => {
  it("parses Bt and Bz GSM with time_tag", () => {
    const data = parseSolarWindMagField(magFixture);
    expect(typeof data.bt).toBe("number");
    expect(typeof data.bz_gsm).toBe("number");
    expect(data.time_tag).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it("handles negative Bz southward value", () => {
    const south = JSON.stringify([{ bt: 10, bz_gsm: -12.3, time_tag: "2026-08-25T17:45:00Z" }]);
    const data = parseSolarWindMagField(south);
    expect(data.bz_gsm).toBe(-12.3);
    expect(data.bt).toBe(10);
  });

  it("throws when JSON shape changes", () => {
    expect(() => parseSolarWindMagField("{}")).toThrow(/parseSolarWindMagField/i);
    expect(() => parseSolarWindMagField("not json")).toThrow(/parseSolarWindMagField/i);
    expect(() => parseSolarWindMagField(JSON.stringify([{ bt: 4 }]))).toThrow(/parseSolarWindMagField/i);
  });
});

describe("parseSolarWindSpeed", () => {
  it("parses proton_speed with time_tag", () => {
    const data = parseSolarWindSpeed(speedFixture);
    expect(typeof data.proton_speed).toBe("number");
    expect(data.proton_speed).toBeGreaterThan(200);
    expect(data.time_tag).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it("throws when shape changes", () => {
    expect(() => parseSolarWindSpeed("{}")).toThrow(/parseSolarWindSpeed/i);
    expect(() => parseSolarWindSpeed(JSON.stringify([{ proton_speed: "fast" }]))).toThrow(/parseSolarWindSpeed/i);
  });
});

describe("parseRtswWind", () => {
  it("parses speed, density and source, sorting oldest-first", () => {
    const points = parseRtswWind(rtswWindFixture);
    expect(points.length).toBeGreaterThan(5);
    expect(points[0].time_tag < points[points.length - 1].time_tag).toBe(true);
    for (const point of points) {
      expect(point.time_tag).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(point.speed === null || typeof point.speed === "number").toBe(true);
      expect(point.density === null || typeof point.density === "number").toBe(true);
      expect(point.source === null || typeof point.source === "string").toBe(true);
    }
    // The live feed names its L1 spacecraft
    expect(points.map((p) => p.source)).toContain("IMAP");
  });

  it("tolerates rows missing a reading or source", () => {
    const text = JSON.stringify([
      { time_tag: "2026-08-26T22:00:00", proton_speed: 300, source: "IMAP" },
      { time_tag: "2026-08-26T22:01:00" },
      { time_tag: "2026-08-26T22:02:00", proton_speed: null, proton_density: 5 },
    ]);
    const points = parseRtswWind(text);
    expect(points).toEqual([
      { time_tag: "2026-08-26T22:00:00", speed: 300, density: null, source: "IMAP" },
      { time_tag: "2026-08-26T22:01:00", speed: null, density: null, source: null },
      { time_tag: "2026-08-26T22:02:00", speed: null, density: 5, source: null },
    ]);
  });

  it("throws when shape changes", () => {
    expect(() => parseRtswWind("{}")).toThrow(/parseRtswWind/i);
    expect(() => parseRtswWind("not json")).toThrow(/parseRtswWind/i);
    expect(() => parseRtswWind(JSON.stringify([{ proton_speed: 1 }]))).toThrow(/parseRtswWind/i);
  });
});

describe("parseRtswMagField", () => {
  it("parses Bt and Bz GSM, sorting oldest-first", () => {
    const points = parseRtswMagField(rtswMagFixture);
    expect(points.length).toBeGreaterThan(5);
    expect(points[0].time_tag < points[points.length - 1].time_tag).toBe(true);
    for (const point of points) {
      expect(point.time_tag).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(point.bt === null || typeof point.bt === "number").toBe(true);
      expect(point.bz_gsm === null || typeof point.bz_gsm === "number").toBe(true);
    }
  });

  it("throws when shape changes", () => {
    expect(() => parseRtswMagField("[]")).toThrow(/parseRtswMagField/i);
    expect(() => parseRtswMagField(JSON.stringify([{ bt: 4 }]))).toThrow(/parseRtswMagField/i);
  });
});
