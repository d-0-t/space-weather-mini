// The fixture timestamps are local to Kiruna (Europe/Stockholm, timezone
// auto) and the mapper passes them through verbatim, so no timezone pinning
// is needed; the fetch-time stamp tests pin the system clock instead.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  OPEN_METEO_FORECAST_URL,
  fetchWeather,
  mapWeatherResponse,
  type WeatherHour,
} from "./weather";
import kirunaFixture from "./fixtures/open-meteo-kiruna.json";
import { jsonResponse } from "../test/nominatim-test-utils";

describe("Open-Meteo response mapping (ticket 03)", () => {
  it("maps the real Kiruna response into the typed current conditions", () => {
    const mapped = mapWeatherResponse(kirunaFixture);
    expect(mapped.current).toEqual({
      observedAt: "2026-09-01T20:15",
      temperatureC: 10.6,
      humidityPercent: 97,
      cloudCoverPercent: 100,
      // The current block carries no low/mid/high split in the payload, so
      // the mapper borrows the split from the hourly entry of the same hour.
      cloudLowPercent: 100,
      cloudMidPercent: 22,
      cloudHighPercent: 17,
      weatherCode: 63,
      windSpeedKmh: 16.9,
    });
  });

  it("windows the hourly strip to the first 24 entries from 00:00 local", () => {
    const mapped = mapWeatherResponse(kirunaFixture);
    expect(mapped.hourly).toHaveLength(24);
    expect(mapped.hourly[0].time).toBe("2026-09-01T00:00");
    expect(mapped.hourly[23].time).toBe("2026-09-01T23:00");
    expect(mapped.hourly[0]).toEqual<WeatherHour>({
      time: "2026-09-01T00:00",
      temperatureC: 10.6,
      humidityPercent: 98,
      cloudCoverPercent: 100,
      cloudLowPercent: 5,
      cloudMidPercent: 94,
      cloudHighPercent: 100,
      weatherCode: 3,
    });
  });

  it("keeps up to three daily cards with max, min, code and sun times", () => {
    const mapped = mapWeatherResponse(kirunaFixture);
    expect(mapped.daily).toHaveLength(3);
    expect(mapped.daily[0]).toEqual({
      date: "2026-09-01",
      weatherCode: 65,
      temperatureMaxC: 12.8,
      temperatureMinC: 9.4,
      sunrise: "2026-09-01T05:06",
      sunset: "2026-09-01T20:11",
    });
    expect(mapped.daily[1].temperatureMaxC).toBe(11.5);
    expect(mapped.daily[2].temperatureMaxC).toBe(11.5);
  });

  it("tolerates unknown fields in the payload", () => {
    const withUnknown = {
      ...kirunaFixture,
      current: { ...kirunaFixture.current, extra_field: "ignored" },
      hourly: {
        ...kirunaFixture.hourly,
        time: [...kirunaFixture.hourly.time],
      },
      unknown_block: { anything: true },
    };
    const mapped = mapWeatherResponse(withUnknown);
    expect(mapped.current.temperatureC).toBe(10.6);
    expect(mapped.hourly).toHaveLength(24);
  });

  it("fails loudly on a payload missing the required blocks", () => {
    expect(() => mapWeatherResponse(null)).toThrow(/Open-Meteo/);
    expect(() => mapWeatherResponse({})).toThrow(/Open-Meteo/);
    expect(() =>
      mapWeatherResponse({
        current: kirunaFixture.current,
        hourly: kirunaFixture.hourly,
      }),
    ).toThrow(/Open-Meteo/);
  });

  it("fails loudly when a required array is not numeric", () => {
    expect(() =>
      mapWeatherResponse({
        ...kirunaFixture,
        hourly: { ...kirunaFixture.hourly, temperature_2m: "10" },
      }),
    ).toThrow(/Open-Meteo/);
  });

  it("fails loudly when the hourly arrays differ in length", () => {
    expect(() =>
      mapWeatherResponse({
        ...kirunaFixture,
        hourly: {
          ...kirunaFixture.hourly,
          temperature_2m: kirunaFixture.hourly.temperature_2m.slice(0, 12),
        },
      }),
    ).toThrow(/Open-Meteo/);
  });

  it("fails loudly when the current observation falls outside the hourly strip", () => {
    expect(() =>
      mapWeatherResponse({
        ...kirunaFixture,
        current: { ...kirunaFixture.current, time: "2026-09-03T23:45" },
      }),
    ).toThrow(/Open-Meteo/);
  });
});

describe("Open-Meteo weather fetch (ticket 03)", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("builds the documented single-call URL for the place", async () => {
    mockFetch.mockResolvedValue(jsonResponse(kirunaFixture));
    await fetchWeather(67.8558, 20.2253, mockFetch);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = new URL(String(mockFetch.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe(OPEN_METEO_FORECAST_URL);
    expect(url.searchParams.get("latitude")).toBe("67.8558");
    expect(url.searchParams.get("longitude")).toBe("20.2253");
    expect(url.searchParams.get("current")).toBe(
      "temperature_2m,relative_humidity_2m,cloud_cover,weather_code,wind_speed_10m",
    );
    expect(url.searchParams.get("hourly")).toBe(
      "temperature_2m,relative_humidity_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,weather_code",
    );
    expect(url.searchParams.get("daily")).toBe(
      "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset",
    );
    expect(url.searchParams.get("timezone")).toBe("auto");
    expect(url.searchParams.get("forecast_days")).toBe("3");
  });

  it("returns the mapped weather with the fetch time stamped", async () => {
    vi.useFakeTimers({ toFake: ["Date"] } as unknown as Parameters<
      typeof vi.useFakeTimers
    >[0]);
    vi.setSystemTime(new Date("2026-09-01T18:00:00Z"));
    mockFetch.mockResolvedValue(jsonResponse(kirunaFixture));
    const data = await fetchWeather(67.8558, 20.2253, mockFetch);
    expect(data.fetchedAt).toBe("2026-09-01T18:00:00.000Z");
    expect(data.current.temperatureC).toBe(10.6);
    expect(data.hourly).toHaveLength(24);
    expect(data.daily).toHaveLength(3);
  });

  it("throws on a non-ok response", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, 500));
    await expect(fetchWeather(67.8558, 20.2253, mockFetch)).rejects.toThrow(
      /Open-Meteo returned 500/,
    );
  });

  it("throws on a network rejection", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));
    await expect(fetchWeather(67.8558, 20.2253, mockFetch)).rejects.toThrow(
      "network down",
    );
  });
});