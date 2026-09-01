import { describe, expect, it } from "vitest";

import { WMO_WEATHER, UNKNOWN_WMO_WEATHER, wmoWeather } from "./wmo-codes";
import kirunaFixture from "./fixtures/open-meteo-kiruna.json";

/**
 * The WMO weather codes Open-Meteo can return, per its docs table
 * (docs/research/aurora-local-conditions-2026-09-01.md section 3). The
 * lookup file is closed: every code must resolve to short English text plus
 * an icon name, and anything outside the list falls back to the unknown
 * entry instead of rendering blank.
 */
const OPEN_METEO_WMO_CODES: readonly number[] = [
  0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77,
  80, 81, 82, 85, 86, 95, 96, 99,
];

describe("WMO weather code lookup (ticket 03)", () => {
  it("maps every code Open-Meteo documents to short text plus an icon name", () => {
    for (const code of OPEN_METEO_WMO_CODES) {
      const entry = WMO_WEATHER[code];
      expect(entry, `code ${code} is missing from the lookup`).toBeDefined();
      expect(entry.text.length).toBeGreaterThan(0);
      expect(entry.icon.length).toBeGreaterThan(0);
    }
  });

  it("pins the well-known codes to their short English text", () => {
    expect(wmoWeather(0).text).toBe("Clear sky");
    expect(wmoWeather(3).text).toBe("Overcast");
    expect(wmoWeather(45).text).toBe("Fog");
    expect(wmoWeather(63).text).toBe("Moderate rain");
    expect(wmoWeather(71).text).toBe("Slight snow");
    expect(wmoWeather(95).text).toBe("Thunderstorm");
  });

  it("resolves every weather code used in the Kiruna fixture", () => {
    const usedCodes = new Set<number>([
      ...kirunaFixture.hourly.weather_code,
      ...kirunaFixture.daily.weather_code,
      kirunaFixture.current.weather_code,
    ]);
    for (const code of usedCodes) {
      expect(wmoWeather(code).text.length).toBeGreaterThan(0);
      expect(wmoWeather(code).icon.length).toBeGreaterThan(0);
    }
    // The fixture must actually exercise the lookup: rain codes at Kiruna.
    expect(usedCodes.has(63)).toBe(true);
  });

  it("falls back to a safe unknown entry for codes outside the list", () => {
    const unknown = wmoWeather(999);
    expect(unknown).toEqual(UNKNOWN_WMO_WEATHER);
    expect(unknown.text).toBe("Unknown");
    expect(unknown.icon).toBe("unknown");
    expect(wmoWeather(-1)).toEqual(UNKNOWN_WMO_WEATHER);
    expect(wmoWeather(Number.NaN)).toEqual(UNKNOWN_WMO_WEATHER);
  });
});