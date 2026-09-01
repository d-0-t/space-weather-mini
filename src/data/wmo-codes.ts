/**
 * Closed WMO weather code lookup for Local conditions (ticket 03): each code
 * Open-Meteo can return maps to short English text plus an icon name the
 * page renders. Open-Meteo sends only the numeric code, never a string, so
 * the text lives here; an unknown code falls back to the safe unknown entry
 * instead of rendering blank. See the contract test for coverage.
 */

export interface WmoWeather {
  /** Short English description, e.g. "Moderate rain". */
  text: string;
  /** Icon name the page maps to a rendered glyph, e.g. "rain". */
  icon: string;
}

/** The closed map from WMO code to text and icon name. */
export const WMO_WEATHER: Readonly<Record<number, WmoWeather>> = {
  0: { text: "Clear sky", icon: "clear" },
  1: { text: "Mainly clear", icon: "mostly-clear" },
  2: { text: "Partly cloudy", icon: "partly-cloudy" },
  3: { text: "Overcast", icon: "overcast" },
  45: { text: "Fog", icon: "fog" },
  48: { text: "Rime fog", icon: "fog" },
  51: { text: "Light drizzle", icon: "drizzle" },
  53: { text: "Moderate drizzle", icon: "drizzle" },
  55: { text: "Dense drizzle", icon: "drizzle" },
  56: { text: "Light freezing drizzle", icon: "freezing-drizzle" },
  57: { text: "Dense freezing drizzle", icon: "freezing-drizzle" },
  61: { text: "Slight rain", icon: "rain" },
  63: { text: "Moderate rain", icon: "rain" },
  65: { text: "Heavy rain", icon: "rain" },
  66: { text: "Light freezing rain", icon: "freezing-rain" },
  67: { text: "Heavy freezing rain", icon: "freezing-rain" },
  71: { text: "Slight snow", icon: "snow" },
  73: { text: "Moderate snow", icon: "snow" },
  75: { text: "Heavy snow", icon: "snow" },
  77: { text: "Snow grains", icon: "snow-grains" },
  80: { text: "Slight rain showers", icon: "rain-showers" },
  81: { text: "Moderate rain showers", icon: "rain-showers" },
  82: { text: "Violent rain showers", icon: "rain-showers" },
  85: { text: "Slight snow showers", icon: "snow-showers" },
  86: { text: "Heavy snow showers", icon: "snow-showers" },
  95: { text: "Thunderstorm", icon: "thunderstorm" },
  96: { text: "Thunderstorm with slight hail", icon: "thunderstorm-hail" },
  99: { text: "Thunderstorm with heavy hail", icon: "thunderstorm-hail" },
};

/** The safe entry for a code outside the closed map. */
export const UNKNOWN_WMO_WEATHER: WmoWeather = {
  text: "Unknown",
  icon: "unknown",
};

/** Text and icon for a WMO weather code, falling back to the unknown entry. */
export function wmoWeather(code: number): WmoWeather {
  return WMO_WEATHER[code] ?? UNKNOWN_WMO_WEATHER;
}