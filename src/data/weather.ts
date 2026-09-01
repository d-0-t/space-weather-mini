/**
 * Weather for Local conditions (ticket 03): one Open-Meteo forecast call per
 * place with `timezone=auto`, mapped to a typed view model windowed to the
 * 24-hour hourly strip and three daily cards. The fetch contract is pinned
 * by the unit suite against the real Kiruna fixture captured live on
 * 2026-09-01; a payload shape change throws loudly instead of rendering
 * blanks (spec user story 21).
 */

export const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export interface WeatherCurrent {
  /** Local-time observation instant, e.g. "2026-09-01T20:15". */
  observedAt: string;
  temperatureC: number;
  humidityPercent: number;
  cloudCoverPercent: number;
  /** Cloud split by height band, borrowed from the same-hour hourly entry. */
  cloudLowPercent: number;
  cloudMidPercent: number;
  cloudHighPercent: number;
  weatherCode: number;
  windSpeedKmh: number;
}

export interface WeatherHour {
  /** Local-time hour label, e.g. "2026-09-01T14:00". */
  time: string;
  temperatureC: number;
  humidityPercent: number;
  cloudCoverPercent: number;
  cloudLowPercent: number;
  cloudMidPercent: number;
  cloudHighPercent: number;
  weatherCode: number;
}

export interface WeatherDay {
  /** Local calendar date, e.g. "2026-09-01". */
  date: string;
  weatherCode: number;
  temperatureMaxC: number;
  temperatureMinC: number;
  /** Local-time sun times, e.g. "2026-09-01T05:06". */
  sunrise: string;
  sunset: string;
}

/** The mapped forecast core: current conditions plus the windowed strip and row. */
export interface WeatherPayload {
  current: WeatherCurrent;
  /** First 24 hourly entries from 00:00 local – the scrolling strip. */
  hourly: WeatherHour[];
  /** Up to three daily cards. */
  daily: WeatherDay[];
}

/** The payload plus the fetch instant, stamped when the response lands. */
export interface WeatherData extends WeatherPayload {
  /** ISO 8601 instant of the fetch, driving the "Data from Open-Meteo at" timestamp. */
  fetchedAt: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** The documented `current` variables of the single-call contract. */
const CURRENT_VARIABLES =
  "temperature_2m,relative_humidity_2m,cloud_cover,weather_code,wind_speed_10m";

/** The documented `hourly` variables of the single-call contract. */
const HOURLY_VARIABLES =
  "temperature_2m,relative_humidity_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,weather_code";

/** The documented `daily` variables of the single-call contract. */
const DAILY_VARIABLES = "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset";

const HOURS_IN_STRIP = 24;
const DAYS_IN_ROW = 3;

/** Number of a required field, throwing on a shape change so failures stay loud. */
const numberField = (block: Record<string, unknown>, field: string): number => {
  const value = block[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Open-Meteo ${field} is not a finite number`);
  }
  return value;
};

/** Numeric array of a required field, throwing on a shape change. */
const numberArray = (block: Record<string, unknown>, field: string): number[] => {
  const value = block[field];
  if (!Array.isArray(value) || value.some((n) => typeof n !== "number")) {
    throw new Error(`Open-Meteo ${field} is not a numeric array`);
  }
  return value as number[];
};

/** String array of a required field, throwing on a shape change. */
const stringArray = (block: Record<string, unknown>, field: string): string[] => {
  const value = block[field];
  if (!Array.isArray(value) || value.some((s) => typeof s !== "string")) {
    throw new Error(`Open-Meteo ${field} is not a string array`);
  }
  return value as string[];
};

/**
 * Maps a real Open-Meteo forecast response to the typed view model. The
 * hourly strip keeps the first 24 entries from 00:00 local; the daily row
 * keeps up to three cards. The current block has no low/mid/high split in
 * the payload, so it borrows the split from the hourly entry of the same
 * hour; a payload that cannot supply it throws loudly (spec user story 21).
 */
export function mapWeatherResponse(raw: unknown): WeatherPayload {
  if (!isRecord(raw)) throw new Error("Open-Meteo returned a non-object payload");
  const current = raw.current;
  if (!isRecord(current)) throw new Error("Open-Meteo returned no current block");
  const hourly = raw.hourly;
  if (!isRecord(hourly)) throw new Error("Open-Meteo returned no hourly block");
  const daily = raw.daily;
  if (!isRecord(daily)) throw new Error("Open-Meteo returned no daily block");

  const observedAtField = current.time;
  if (typeof observedAtField !== "string" || observedAtField === "") {
    throw new Error("Open-Meteo current.time is not a string");
  }

  // Hourly and daily come as parallel arrays; a length mismatch or a block
  // shorter than the window is a payload shape change and throws loudly.
  const hourlyTimes = stringArray(hourly, "time");
  const hourlyTemps = numberArray(hourly, "temperature_2m");
  const hourlyHumidity = numberArray(hourly, "relative_humidity_2m");
  const hourlyCloud = numberArray(hourly, "cloud_cover");
  const hourlyCloudLow = numberArray(hourly, "cloud_cover_low");
  const hourlyCloudMid = numberArray(hourly, "cloud_cover_mid");
  const hourlyCloudHigh = numberArray(hourly, "cloud_cover_high");
  const hourlyCodes = numberArray(hourly, "weather_code");
  if (hourlyTimes.length < HOURS_IN_STRIP) {
    throw new Error("Open-Meteo hourly covers fewer than 24 hours");
  }
  for (const values of [
    hourlyTemps,
    hourlyHumidity,
    hourlyCloud,
    hourlyCloudLow,
    hourlyCloudMid,
    hourlyCloudHigh,
    hourlyCodes,
  ]) {
    if (values.length !== hourlyTimes.length) {
      throw new Error("Open-Meteo hourly arrays differ in length");
    }
  }

  const hours: WeatherHour[] = hourlyTimes.slice(0, HOURS_IN_STRIP).map((time, i) => ({
    time,
    temperatureC: hourlyTemps[i],
    humidityPercent: hourlyHumidity[i],
    cloudCoverPercent: hourlyCloud[i],
    cloudLowPercent: hourlyCloudLow[i],
    cloudMidPercent: hourlyCloudMid[i],
    cloudHighPercent: hourlyCloudHigh[i],
    weatherCode: hourlyCodes[i],
  }));

  // The current block's own observation lands inside one of the hourly
  // entries; borrow that entry's low/mid/high split for the current card.
  // A payload whose observation sits outside the strip cannot supply the
  // split, so it fails loudly instead of silently borrowing another hour.
  const observedHour = observedAtField.slice(0, 13);
  const splitHourIndex = hours.findIndex((hour) =>
    hour.time.startsWith(observedHour),
  );
  if (splitHourIndex === -1) {
    throw new Error("Open-Meteo current observation falls outside the hourly strip");
  }
  const splitHour = hours[splitHourIndex];

  const dailyTimes = stringArray(daily, "time");
  const dailyCodes = numberArray(daily, "weather_code");
  const dailyMax = numberArray(daily, "temperature_2m_max");
  const dailyMin = numberArray(daily, "temperature_2m_min");
  const dailySunrise = stringArray(daily, "sunrise");
  const dailySunset = stringArray(daily, "sunset");
  if (dailyTimes.length < DAYS_IN_ROW) {
    throw new Error("Open-Meteo daily covers fewer than 3 days");
  }
  for (const values of [
    dailyCodes,
    dailyMax,
    dailyMin,
    dailySunrise,
    dailySunset,
  ]) {
    if (values.length !== dailyTimes.length) {
      throw new Error("Open-Meteo daily arrays differ in length");
    }
  }

  return {
    current: {
      observedAt: observedAtField,
      temperatureC: numberField(current, "temperature_2m"),
      humidityPercent: numberField(current, "relative_humidity_2m"),
      cloudCoverPercent: numberField(current, "cloud_cover"),
      cloudLowPercent: splitHour.cloudLowPercent,
      cloudMidPercent: splitHour.cloudMidPercent,
      cloudHighPercent: splitHour.cloudHighPercent,
      weatherCode: numberField(current, "weather_code"),
      windSpeedKmh: numberField(current, "wind_speed_10m"),
    },
    hourly: hours,
    daily: dailyTimes.slice(0, DAYS_IN_ROW).map((date, i) => ({
      date,
      weatherCode: dailyCodes[i],
      temperatureMaxC: dailyMax[i],
      temperatureMinC: dailyMin[i],
      sunrise: dailySunrise[i],
      sunset: dailySunset[i],
    })),
  };
}

/**
 * Fetches weather for a geocoded place with the documented single-call
 * contract and `timezone=auto`, and stamps the instant the response lands
 * as `fetchedAt` for the "Data from Open-Meteo at HH:MM local" timestamp.
 * Throws on a failed or misshaped response; the page keeps the last good
 * daylight view and shows the weather error only.
 */
export async function fetchWeather(
  latitude: number,
  longitude: number,
  fetchImpl: typeof fetch = fetch,
): Promise<WeatherData> {
  const url = new URL(OPEN_METEO_FORECAST_URL);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", CURRENT_VARIABLES);
  url.searchParams.set("hourly", HOURLY_VARIABLES);
  url.searchParams.set("daily", DAILY_VARIABLES);
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "3");
  const response = await fetchImpl(url.toString());
  if (!response.ok) {
    throw new Error(`Open-Meteo returned ${response.status}`);
  }
  const raw: unknown = await response.json();
  return { ...mapWeatherResponse(raw), fetchedAt: new Date().toISOString() };
}