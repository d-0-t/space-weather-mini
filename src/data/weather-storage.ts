/**
 * Versioned weather storage for Local conditions: the last Open-Meteo
 * payload the page fetched, persisted so an offline reload still shows the
 * saved weather with its true fetch instant. Corrupt or foreign-shaped
 * storage reads back as null instead of throwing, mirroring the place
 * storage pattern in data/place-storage.ts. One slot keyed by coordinates:
 * a new place's weather replaces the previous place's.
 */

import type { WeatherData } from "./weather";

export const WEATHER_STORAGE_KEY = "sw:local-conditions:weather:v1";

const COORDINATE_DECIMALS = 4;

/** Coordinates rounded so the storage key matches regardless of float noise. */
const rounded = (value: number): number =>
  Number(value.toFixed(COORDINATE_DECIMALS));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isFiniteNumberArray = (value: unknown, length: number): boolean =>
  Array.isArray(value) &&
  value.length === length &&
  value.every((item) => isFiniteNumber(item));

/** Structural check strong enough that a malformed entry can never render. */
const isWeatherData = (value: unknown): value is WeatherData => {
  if (!isRecord(value)) return false;
  const { current, hourly, daily, utcOffsetSeconds, timezone, fetchedAt } =
    value;
  if (
    typeof fetchedAt !== "string" ||
    typeof timezone !== "string" ||
    !isFiniteNumber(utcOffsetSeconds) ||
    !isRecord(current)
  ) {
    return false;
  }
  const {
    observedAt,
    temperatureC,
    humidityPercent,
    cloudCoverPercent,
    cloudLowPercent,
    cloudMidPercent,
    cloudHighPercent,
    weatherCode,
    windSpeedKmh,
  } = current;
  if (
    typeof observedAt !== "string" ||
    ![
      temperatureC,
      humidityPercent,
      cloudCoverPercent,
      cloudLowPercent,
      cloudMidPercent,
      cloudHighPercent,
      weatherCode,
      windSpeedKmh,
    ].every(isFiniteNumber)
  ) {
    return false;
  }
  if (
    !Array.isArray(hourly) ||
    hourly.length === 0 ||
    !Array.isArray(daily) ||
    daily.length === 0
  ) {
    return false;
  }
  return (
    hourly.every((hour) => {
      if (!isRecord(hour)) return false;
      return (
        typeof hour.time === "string" &&
        typeof hour.weatherCode === "number" &&
        isFiniteNumber(hour.temperatureC) &&
        isFiniteNumber(hour.humidityPercent) &&
        isFiniteNumber(hour.cloudCoverPercent)
      );
    }) &&
    daily.every((day) => {
      if (!isRecord(day)) return false;
      return (
        typeof day.date === "string" &&
        typeof day.sunrise === "string" &&
        typeof day.sunset === "string" &&
        typeof day.weatherCode === "number" &&
        isFiniteNumber(day.temperatureMaxC) &&
        isFiniteNumber(day.temperatureMinC)
      );
    })
  );
};

/**
 * Loads the stored weather for a place, or null when nothing is stored, the
 * entry belongs to another place, or the storage is corrupt/misshaped.
 */
export function loadWeather(
  storage: Pick<Storage, "getItem">,
  latitude: number,
  longitude: number,
): WeatherData | null {
  try {
    const raw = storage.getItem(WEATHER_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const { v, latitude: storedLat, longitude: storedLon, weather } = parsed;
    if (
      v !== 1 ||
      rounded(storedLat as number) !== rounded(latitude) ||
      rounded(storedLon as number) !== rounded(longitude)
    ) {
      return null;
    }
    return isWeatherData(weather) ? weather : null;
  } catch {
    return null;
  }
}

/** Persists the place's weather as a versioned, coordinate-keyed slot. */
export function saveWeather(
  storage: Pick<Storage, "setItem">,
  latitude: number,
  longitude: number,
  weather: WeatherData,
): void {
  storage.setItem(
    WEATHER_STORAGE_KEY,
    JSON.stringify({
      v: 1,
      latitude: rounded(latitude),
      longitude: rounded(longitude),
      weather,
    }),
  );
}
