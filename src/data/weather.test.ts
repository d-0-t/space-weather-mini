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
      observedAt: "2026-09-09T01:00",
      temperatureC: 2.6,
      humidityPercent: 87,
      cloudCoverPercent: 19,
      // The current block carries no low/mid/high split in the payload, so
      // the mapper borrows the split from the hourly entry of the same hour.
      cloudLowPercent: 21,
      cloudMidPercent: 0,
      cloudHighPercent: 2,
      weatherCode: 0,
      windSpeedKmh: 9,
    });
  });

  it("windows the hourly strip to 24 entries from the current place-local hour", () => {
    const mapped = mapWeatherResponse(kirunaFixture);
    // The fixture was captured with `forecast_hours=24` at 01:00 local: the
    // strip starts at the observation's hour and spans into the next day.
    expect(mapped.hourly).toHaveLength(24);
    expect(mapped.hourly[0].time).toBe("2026-09-09T01:00");
    expect(mapped.hourly[0].time.slice(0, 13)).toBe(
      kirunaFixture.current.time.slice(0, 13),
    );
    expect(mapped.hourly[23].time).toBe("2026-09-10T00:00");
    expect(mapped.hourly[0]).toEqual<WeatherHour>({
      time: "2026-09-09T01:00",
      temperatureC: 2.6,
      humidityPercent: 87,
      cloudCoverPercent: 19,
      cloudLowPercent: 21,
      cloudMidPercent: 0,
      cloudHighPercent: 2,
      weatherCode: 0,
    });
  });

  it("keeps up to three daily cards with max, min, code and sun times", () => {
    const mapped = mapWeatherResponse(kirunaFixture);
    expect(mapped.daily).toHaveLength(3);
    expect(mapped.daily[0]).toEqual({
      date: "2026-09-09",
      weatherCode: 3,
      temperatureMaxC: 12.3,
      temperatureMinC: 2.1,
      sunrise: "2026-09-09T05:35",
      sunset: "2026-09-09T19:37",
    });
    expect(mapped.daily[1].temperatureMaxC).toBe(11.4);
    expect(mapped.daily[2].temperatureMaxC).toBe(11.5);
  });

  it("retains the payload's UTC offset and IANA timezone for place-local conversion (ticket 02)", () => {
    const mapped = mapWeatherResponse(kirunaFixture);
    expect(mapped.utcOffsetSeconds).toBe(7200);
    expect(mapped.timezone).toBe("Europe/Stockholm");
  });

  it("fails loudly when the offset or timezone is missing", () => {
    // `timezone=auto` always returns both; a payload without them is a
    // shape change and must not silently render wrong times
    const { utc_offset_seconds, ...withoutOffset } = kirunaFixture;
    expect(() => mapWeatherResponse(withoutOffset)).toThrow(/Open-Meteo/);
    const { timezone, ...withoutZone } = kirunaFixture;
    expect(() => mapWeatherResponse(withoutZone)).toThrow(/Open-Meteo/);
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
    expect(mapped.current.temperatureC).toBe(2.6);
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
    expect(url.searchParams.get("forecast_hours")).toBe("24");
  });

  it("returns the mapped weather with the fetch time stamped", async () => {
    vi.useFakeTimers({ toFake: ["Date"] } as unknown as Parameters<
      typeof vi.useFakeTimers
    >[0]);
    vi.setSystemTime(new Date("2026-09-01T18:00:00Z"));
    mockFetch.mockResolvedValue(jsonResponse(kirunaFixture));
    const data = await fetchWeather(67.8558, 20.2253, mockFetch);
    expect(data.fetchedAt).toBe("2026-09-01T18:00:00.000Z");
    expect(data.current.temperatureC).toBe(2.6);
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