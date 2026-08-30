import { describe, expect, it } from "vitest";

import { isSunBelowHorizon, solarElevationDegrees } from "./sun";

describe("solar elevation (NOAA approximation)", () => {
  it("puts the sun near the zenith at the equator at noon on the equinox", () => {
    const elevation = solarElevationDegrees(0, 0, new Date("2026-03-20T12:00:00Z"));
    expect(elevation).toBeGreaterThan(88);
    expect(elevation).toBeLessThanOrEqual(90);
  });

  it("puts the sun at the winter-solstice noontime height at the equator", () => {
    // Declination ≈ −23.44° at the December solstice → zenith distance ≈ 23.4°
    const elevation = solarElevationDegrees(0, 0, new Date("2026-12-21T12:00:00Z"));
    expect(elevation).toBeGreaterThan(66);
    expect(elevation).toBeLessThan(67);
  });

  it("keeps the midnight sun above the horizon at Tromsø on the summer solstice", () => {
    expect(isSunBelowHorizon(69.65, 18.96, new Date("2026-06-21T12:00:00Z"))).toBe(
      false,
    );
  });

  it("keeps the polar night below the horizon at Tromsø on the winter solstice", () => {
    expect(isSunBelowHorizon(69.65, 18.96, new Date("2026-12-21T12:00:00Z"))).toBe(
      true,
    );
  });
});

describe("isSunBelowHorizon – actual sunrise/sunset of the day", () => {
  // Hope, NJ (40.9°N, −74.97°E): mid-July sunrise ≈ 09:40 UTC, sunset ≈ 00:30 UTC next day
  const hope = { latitude: 40.9, longitude: -74.97 };

  it("is below the horizon before local sunrise and above it after", () => {
    expect(isSunBelowHorizon(hope.latitude, hope.longitude, new Date("2026-07-15T09:00:00Z"))).toBe(true);
    expect(isSunBelowHorizon(hope.latitude, hope.longitude, new Date("2026-07-15T10:30:00Z"))).toBe(false);
  });

  it("is above the horizon before local sunset and below it after", () => {
    expect(isSunBelowHorizon(hope.latitude, hope.longitude, new Date("2026-07-15T23:00:00Z"))).toBe(false);
    expect(isSunBelowHorizon(hope.latitude, hope.longitude, new Date("2026-07-16T01:30:00Z"))).toBe(true);
  });

  it("counts twilight as dark (sun below the horizon, elevation between −6° and 0°)", () => {
    // 09:00 UTC sits in morning civil twilight – aurora can still be on
    const elevation = solarElevationDegrees(hope.latitude, hope.longitude, new Date("2026-07-15T09:00:00Z"));
    expect(elevation).toBeLessThan(0);
    expect(elevation).toBeGreaterThan(-8);
  });

  it("follows western longitudes (local solar time behind UTC)", () => {
    // Yellowknife (62.45°N, −114.37°E), 2026-01-15: 20:00 UTC = ~13:00 local
    expect(isSunBelowHorizon(62.45, -114.37, new Date("2026-01-15T20:00:00Z"))).toBe(false);
    // 03:00 UTC = ~20:00 local – deep winter night
    expect(isSunBelowHorizon(62.45, -114.37, new Date("2026-01-15T03:00:00Z"))).toBe(true);
  });
});