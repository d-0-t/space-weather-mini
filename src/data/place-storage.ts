/**
 * Versioned geocoded place storage for Local conditions: the last place the
 * visitor picked from the Nominatim match list or browser geolocation,
 * persisted across visits. Corrupt or foreign-shaped storage falls back to
 * the default geocoded place (Östersund), mirroring the webcam storage
 * pattern in data/webcam-storage.ts.
 */

export interface GeocodedPlace {
  /** Display name as shown to the visitor, e.g. "Kiruna, Norrbotten County, Sweden". */
  displayName: string;
  /** A shorter version of the displayName. */
  shortName: string;
  latitude: number;
  longitude: number;
  /** ISO 8601 instant when the place was geocoded or picked. */
  fetchedAt: string;
  /** Country name as returned by Nominatim address, e.g. "Sverige". */
  country?: string;
  /** ISO 3166-1 alpha-2 lowercased, e.g. "se". */
  countryCode?: string;
}

export const PLACE_STORAGE_KEY = "sw:local-conditions:place:v1";

/**
 * Preset places the page offers without a search. `fetchedAt` is empty
 * because presets are never fetched; the page stamps the instant it
 * persists the default on first open, and every later pick carries its own
 * fetched-at.
 */
export const KIRUNA_PLACE: GeocodedPlace = {
  displayName: "Kiruna, Norrbotten County, Sweden",
  shortName: "Kiruna, Norrbotten County",
  latitude: 67.8558,
  longitude: 20.2253,
  fetchedAt: "",
  country: "Sweden",
  countryCode: "se",
};

/** Second preset place, added 2026-09-01. */
export const LULEA_PLACE: GeocodedPlace = {
  displayName: "Luleå, Norrbotten County, Sweden",
  shortName: "Luleå, Norrbotten County",
  latitude: 65.5848,
  longitude: 22.1546,
  fetchedAt: "",
  country: "Sweden",
  countryCode: "se",
};

/** The preset places a visitor can jump to; the first open shows the default below. */
export const PLACE_PRESETS: readonly GeocodedPlace[] = [
  KIRUNA_PLACE,
  LULEA_PLACE,
];

/**
 * Default geocoded place when nothing is stored: Östersund, Sweden at
 * 63.1792 N 14.6357 E – far enough south that the Night band (sun below
 * −18°) exists most of the year.
 */
export const DEFAULT_PLACE: GeocodedPlace = {
  displayName: "Östersund, Jämtland County, Sweden",
  shortName: "Östersund, Jämtland County",
  latitude: 63.1792,
  longitude: 14.6357,
  fetchedAt: "",
  country: "Sweden",
  countryCode: "se",
};

const isPlausibleLatitude = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= -90 &&
  value <= 90;

const isPlausibleLongitude = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= -180 &&
  value <= 180;

/** Loads the stored geocoded place, falling back to the default when missing or corrupt. */
export function loadGeocodedPlace(
  storage: Pick<Storage, "getItem">,
): GeocodedPlace {
  try {
    const raw = storage.getItem(PLACE_STORAGE_KEY);
    if (!raw) return DEFAULT_PLACE;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_PLACE;
    const { v, place } = parsed as Record<string, unknown>;
    if (v !== 1 || typeof place !== "object" || place === null) {
      return DEFAULT_PLACE;
    }
    const {
      displayName,
      shortName,
      latitude,
      longitude,
      fetchedAt,
      country,
      countryCode,
    } = place as Record<string, unknown>;
    if (
      typeof displayName !== "string" ||
      !isPlausibleLatitude(latitude) ||
      !isPlausibleLongitude(longitude) ||
      typeof fetchedAt !== "string" ||
      typeof shortName !== "string"
    ) {
      return DEFAULT_PLACE;
    }
    const maybeCountry = typeof country === "string" ? country : undefined;
    const maybeCountryCode =
      typeof countryCode === "string" ? countryCode.toLowerCase() : undefined;
    return {
      displayName,
      shortName,
      latitude,
      longitude,
      fetchedAt,
      country: maybeCountry,
      countryCode: maybeCountryCode,
    };
  } catch {
    return DEFAULT_PLACE;
  }
}

/** Persists the picked geocoded place as a versioned value. */
export function saveGeocodedPlace(
  storage: Pick<Storage, "setItem">,
  place: GeocodedPlace,
): void {
  storage.setItem(PLACE_STORAGE_KEY, JSON.stringify({ v: 1, place }));
}
