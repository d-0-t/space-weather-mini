import { describe, expect, it } from "vitest";
import { parseSolarWindMagField, parseSolarWindSpeed } from "./solar-wind";
import magFixture from "./fixtures/solar-wind-mag-field.json?raw";
import speedFixture from "./fixtures/solar-wind-speed.json?raw";

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
