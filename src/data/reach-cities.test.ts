import { describe, expect, it } from "vitest";

import { REACH_CITIES, approxGeomagneticLatitude } from "./reach-cities";

/**
 * Independent IGRF-14 values from WDC for Geomagnetism, Kyoto's
 * "Magnetic North, Geomagnetic and Magnetic Poles" coordinate
 * transformation (epoch 2025.0), read live 2026-09-14. The stored
 * centered-dipole approximations are compared with a half-degree window.
 */
const IGRF_SPOT_CHECKS: Record<string, number> = {
  Tromsø: 67.4,
  Rovaniemi: 63.49,
  Yellowknife: 68.37,
  Hobart: -49.4,
  Ushuaia: -45.44,
};

describe("reach city data", () => {
  it("stays inside the 45-70 degree |geomagnetic latitude| window", () => {
    for (const city of REACH_CITIES) {
      expect(Math.abs(city.mlat), city.city).toBeGreaterThanOrEqual(45);
      expect(Math.abs(city.mlat), city.city).toBeLessThanOrEqual(70);
    }
  });

  it("carries a two-letter ISO 3166-1 country code and a unique city per country", () => {
    for (const city of REACH_CITIES) {
      expect(city.countryCode, city.city).toMatch(/^[a-z]{2}$/);
      expect(city.country.length, city.city).toBeGreaterThan(0);
      expect(city.city.length).toBeGreaterThan(0);
      expect(Number.isFinite(city.lat), city.city).toBe(true);
      expect(Number.isFinite(city.lon), city.city).toBe(true);
    }
    const keys = REACH_CITIES.map((city) => `${city.country}/${city.city}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("matches the IGRF-14 dipole spot checks within half a degree", () => {
    for (const [city, expected] of Object.entries(IGRF_SPOT_CHECKS)) {
      const entry = REACH_CITIES.find((candidate) => candidate.city === city);
      expect(entry, `missing ${city}`).toBeDefined();
      expect(Math.abs(entry!.mlat - expected), city).toBeLessThan(0.5);
    }
  });
});

describe("approxGeomagneticLatitude (ticket 06)", () => {
  it("reproduces every table row's precomputed value within half a degree", () => {
    for (const city of REACH_CITIES) {
      const computed = approxGeomagneticLatitude(city.lat, city.lon);
      expect(
        Math.abs(computed - city.mlat),
        `${city.city}: computed ${computed}, stored ${city.mlat}`,
      ).toBeLessThan(0.5);
    }
  });

  it("matches the IGRF-14 dipole spot checks within half a degree", () => {
    for (const [city, expected] of Object.entries(IGRF_SPOT_CHECKS)) {
      const entry = REACH_CITIES.find((candidate) => candidate.city === city);
      expect(entry, `missing ${city}`).toBeDefined();
      expect(
        Math.abs(
          approxGeomagneticLatitude(entry!.lat, entry!.lon) - expected,
        ),
        city,
      ).toBeLessThan(0.5);
    }
  });

  it("keeps the southern hemisphere negative", () => {
    expect(approxGeomagneticLatitude(-42.8794, 147.3294)).toBeLessThan(0);
  });
});
