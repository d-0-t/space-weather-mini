import { beforeEach, describe, expect, it } from "vitest";

import type { WeatherData } from "./weather";
import {
  WEATHER_STORAGE_KEY,
  loadWeather,
  saveWeather,
} from "./weather-storage";

const KIRUNA = { latitude: 67.8558, longitude: 20.2253 };

const weather = (overrides: Partial<WeatherData> = {}): WeatherData => ({
  utcOffsetSeconds: 3600,
  timezone: "Europe/Stockholm",
  fetchedAt: "2026-09-09T18:00:00.000Z",
  current: {
    observedAt: "2026-09-09T20:15",
    temperatureC: 7.4,
    humidityPercent: 78,
    cloudCoverPercent: 12,
    cloudLowPercent: 0,
    cloudMidPercent: 10,
    cloudHighPercent: 2,
    weatherCode: 1,
    windSpeedKmh: 11,
  },
  hourly: [
    {
      time: "2026-09-09T20:00",
      temperatureC: 7.1,
      humidityPercent: 80,
      cloudCoverPercent: 9,
      cloudLowPercent: 0,
      cloudMidPercent: 8,
      cloudHighPercent: 1,
      weatherCode: 1,
    },
  ],
  daily: [
    {
      date: "2026-09-09",
      weatherCode: 1,
      temperatureMaxC: 9.5,
      temperatureMinC: 2.1,
      sunrise: "2026-09-09T05:42",
      sunset: "2026-09-09T19:10",
    },
  ],
  ...overrides,
});

const stored = (): unknown =>
  JSON.parse(localStorage.getItem(WEATHER_STORAGE_KEY)!) as unknown;

describe("weather storage (offline persistence for Local conditions)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips the saved weather for a place", () => {
    saveWeather(localStorage, KIRUNA.latitude, KIRUNA.longitude, weather());
    expect(
      loadWeather(localStorage, KIRUNA.latitude, KIRUNA.longitude),
    ).toEqual(weather());
  });

  it("stores the payload under the versioned key", () => {
    saveWeather(localStorage, KIRUNA.latitude, KIRUNA.longitude, weather());
    const parsed = stored() as Record<string, unknown>;
    expect(parsed.v).toBe(1);
    expect(parsed.latitude).toBe(KIRUNA.latitude);
    expect(parsed.longitude).toBe(KIRUNA.longitude);
    expect(parsed.weather).toBeDefined();
  });

  it("returns null for another place – one slot, keyed by coordinates", () => {
    saveWeather(localStorage, KIRUNA.latitude, KIRUNA.longitude, weather());
    expect(loadWeather(localStorage, 63.1792, 14.6357)).toBeNull();
  });

  it("overwrites the slot when a new place's weather is saved", () => {
    saveWeather(localStorage, KIRUNA.latitude, KIRUNA.longitude, weather());
    saveWeather(
      localStorage,
      63.1792,
      14.6357,
      weather({ fetchedAt: "2026-09-09T19:00:00.000Z" }),
    );
    expect(loadWeather(localStorage, KIRUNA.latitude, KIRUNA.longitude)).toBeNull();
    expect(loadWeather(localStorage, 63.1792, 14.6357)?.fetchedAt).toBe(
      "2026-09-09T19:00:00.000Z",
    );
  });

  it("returns null when nothing is stored", () => {
    expect(
      loadWeather(localStorage, KIRUNA.latitude, KIRUNA.longitude),
    ).toBeNull();
  });

  it("returns null on corrupt JSON instead of throwing", () => {
    localStorage.setItem(WEATHER_STORAGE_KEY, "{not json");
    expect(
      loadWeather(localStorage, KIRUNA.latitude, KIRUNA.longitude),
    ).toBeNull();
  });

  it("returns null on a foreign version", () => {
    localStorage.setItem(
      WEATHER_STORAGE_KEY,
      JSON.stringify({
        v: 99,
        latitude: KIRUNA.latitude,
        longitude: KIRUNA.longitude,
        weather: weather(),
      }),
    );
    expect(
      loadWeather(localStorage, KIRUNA.latitude, KIRUNA.longitude),
    ).toBeNull();
  });

  it("returns null when the stored payload is misshaped", () => {
    localStorage.setItem(
      WEATHER_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        latitude: KIRUNA.latitude,
        longitude: KIRUNA.longitude,
        weather: { current: null },
      }),
    );
    expect(
      loadWeather(localStorage, KIRUNA.latitude, KIRUNA.longitude),
    ).toBeNull();
  });

  it("returns null when the payload lacks a fetch instant", () => {
    localStorage.setItem(
      WEATHER_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        latitude: KIRUNA.latitude,
        longitude: KIRUNA.longitude,
        weather: { ...weather(), fetchedAt: undefined },
      }),
    );
    expect(
      loadWeather(localStorage, KIRUNA.latitude, KIRUNA.longitude),
    ).toBeNull();
  });
});
