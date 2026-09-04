/**
 * Geocoding for Local conditions: freeform Nominatim search and reverse
 * geocoding of the browser geolocation fix. The search client enforces the
 * Nominatim usage policy: explicit submit only (the page never calls on
 * keystroke), at most one request per second across search and reverse,
 * in-memory dedup by trimmed lowercased query, and a 429's RetryAfter
 * extends the throttle window so the next request waits it out. The
 * referrer names the hosting app and `accept-language` follows the browser.
 */

import { shortDisplayName } from "./short-display-name";
import type { GeocodedPlace } from "./place-storage";

/** One Nominatim match, ready to be picked and stored as a geocoded place. */
export type GeocodeMatch = Omit<GeocodedPlace, "fetchedAt"> & {
  /** Country name from Nominatim address, e.g. "Sverige" / "Norway". */
  country?: string;
  /** ISO 3166-1 alpha-2 code, lowercased, e.g. "se" / "no". */
  countryCode?: string;
};

export type SearchResult =
  | { status: "ok"; matches: GeocodeMatch[] }
  | { status: "no-match" }
  | { status: "busy"; retryAfterSeconds: number | null }
  | { status: "failed" };

export interface GeocodingClient {
  search(query: string): Promise<SearchResult>;
  reverse(latitude: number, longitude: number): Promise<GeocodeMatch | null>;
}

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

/** Nominatim's hard cap: at most one request per second per app. */
const MIN_REQUEST_GAP_MS = 1000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Nominatim returns coordinates as strings; tolerate numbers too. */
const parseCoordinate = (value: unknown): number | null => {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : null;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
};

/**
 * Maps a Nominatim jsonv2 search response to typed matches, skipping
 * entries without a display name or with unparseable or out-of-range
 * coordinates. The array is already capped at five by the `limit` param.
 */
export function mapNominatimSearchResponse(raw: unknown): GeocodeMatch[] {
  if (!Array.isArray(raw)) return [];
  const matches: GeocodeMatch[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const { display_name, lat, lon, address } = entry as Record<
      string,
      unknown
    >;
    if (typeof display_name !== "string" || display_name === "") continue;
    const latitude = parseCoordinate(lat);
    const longitude = parseCoordinate(lon);
    if (latitude === null || longitude === null) continue;
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) continue;
    const addr =
      typeof address === "object" && address !== null
        ? (address as Record<string, unknown>)
        : null;
    const country =
      typeof addr?.["country"] === "string"
        ? (addr["country"] as string)
        : undefined;
    const countryCode =
      typeof addr?.["country_code"] === "string"
        ? (addr["country_code"] as string).toLowerCase()
        : undefined;
    const match: GeocodeMatch = {
      displayName: display_name,
      shortName: shortDisplayName(display_name),
      latitude,
      longitude,
    };
    if (country) match.country = country;
    if (countryCode) match.countryCode = countryCode;
    matches.push(match);
  }
  return matches;
}

/** Maps a Nominatim jsonv2 reverse response to one typed match. */
export function mapNominatimReverseResponse(raw: unknown): GeocodeMatch | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { display_name, lat, lon, address } = raw as Record<string, unknown>;
  if (typeof display_name !== "string" || display_name === "") return null;
  const latitude = parseCoordinate(lat);
  const longitude = parseCoordinate(lon);
  if (latitude === null || longitude === null) return null;
  const addr =
    typeof address === "object" && address !== null
      ? (address as Record<string, unknown>)
      : null;
  const country =
    typeof addr?.["country"] === "string"
      ? (addr["country"] as string)
      : undefined;
  const countryCode =
    typeof addr?.["country_code"] === "string"
      ? (addr["country_code"] as string).toLowerCase()
      : undefined;
  const match: GeocodeMatch = {
    displayName: display_name,
    shortName: shortDisplayName(display_name),
    latitude,
    longitude,
  };
  if (country) match.country = country;
  if (countryCode) match.countryCode = countryCode;
  return match;
}

const retryAfterSecondsOf = (response: Response): number | null => {
  const value = response.headers?.get?.("retry-after");
  if (!value) return null;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.floor(seconds) : null;
};

type RequestResult =
  | { kind: "json"; value: unknown }
  | { kind: "busy"; retryAfterSeconds: number | null }
  | { kind: "failed" };

/**
 * Creates a Nominatim client with per-instance throttle and dedup state.
 * The page creates one client per mount, so a re-render never leaks request
 * state between visits. Both search and reverse share the one-per-second
 * gap and the RetryAfter-extended window, keeping the whole app inside the
 * policy cap.
 */
export function createGeocodingClient(
  fetchImpl: typeof fetch = fetch,
): GeocodingClient {
  const cache = new Map<string, SearchResult>();
  let lastRequestAt = 0;
  let minGapMs = MIN_REQUEST_GAP_MS;

  const waitForGap = async (): Promise<void> => {
    const wait = minGapMs - (Date.now() - lastRequestAt);
    if (wait > 0) await sleep(wait);
  };

  const request = async (url: string): Promise<RequestResult> => {
    await waitForGap();
    lastRequestAt = Date.now();
    try {
      // The referrer names the app (Nominatim's policy requires a real
      // User-Agent or Referer); browsers forbid setting User-Agent.
      const response = await fetchImpl(url, { referrer: location.origin });
      if (response.status === 429) {
        const retryAfterSeconds = retryAfterSecondsOf(response);
        minGapMs = Math.max(
          MIN_REQUEST_GAP_MS,
          (retryAfterSeconds ?? 1) * 1000,
        );
        return { kind: "busy", retryAfterSeconds };
      }
      minGapMs = MIN_REQUEST_GAP_MS;
      if (!response.ok) return { kind: "failed" };
      return { kind: "json", value: await response.json() };
    } catch {
      return { kind: "failed" };
    }
  };

  const search = async (query: string): Promise<SearchResult> => {
    const normalized = query.trim().toLowerCase();
    const cached = cache.get(normalized);
    if (cached) return cached;
    const url = new URL(NOMINATIM_SEARCH_URL);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "5");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", navigator.language || "en");
    url.searchParams.set("q", query.trim());
    const result = await request(url.toString());
    if (result.kind === "busy") {
      return { status: "busy", retryAfterSeconds: result.retryAfterSeconds };
    }
    if (result.kind === "failed") return { status: "failed" };
    const matches = mapNominatimSearchResponse(result.value);
    const searchResult: SearchResult =
      matches.length === 0 ? { status: "no-match" } : { status: "ok", matches };
    // Only settled outcomes reach the cache: a cached busy or failed would
    // block an honest retry of the same query until remount, and the
    // RetryAfter window would never apply to it.
    cache.set(normalized, searchResult);
    return searchResult;
  };

  const reverse = async (
    latitude: number,
    longitude: number,
  ): Promise<GeocodeMatch | null> => {
    const url = new URL(NOMINATIM_REVERSE_URL);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    const result = await request(url.toString());
    return result.kind === "json"
      ? mapNominatimReverseResponse(result.value)
      : null;
  };

  return { search, reverse };
}

export type DeviceLocationErrorKind = "denied" | "timeout" | "unavailable";

export type DeviceLocationResult =
  | {
      status: "ok";
      latitude: number;
      longitude: number;
      /** Fix accuracy in meters, from the browser GeolocationCoordinates. */
      accuracy: number;
    }
  | { status: "error"; kind: DeviceLocationErrorKind };

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 8000,
  maximumAge: 60000,
};

/** Maps a GeolocationPositionError code to its honest kind. */
const errorKindOf = (code: number): DeviceLocationErrorKind => {
  switch (code) {
    case 1: // GeolocationPositionError.PERMISSION_DENIED
      return "denied";
    case 3: // GeolocationPositionError.TIMEOUT
      return "timeout";
    default: // 2 = POSITION_UNAVAILABLE, and anything unknown
      return "unavailable";
  }
};

/**
 * A single shot of the browser geolocation with high accuracy and a short
 * timeout (8 s). Resolves the device coordinates on success and an honest
 * error kind otherwise – the page never offers a manual lat lon entry.
 */
export function getDeviceLocation(): Promise<DeviceLocationResult> {
  return new Promise((resolve) => {
    const geolocation = navigator.geolocation;
    if (!geolocation) {
      resolve({ status: "error", kind: "unavailable" });
      return;
    }
    geolocation.getCurrentPosition(
      (position) =>
        resolve({
          status: "ok",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      (error) => resolve({ status: "error", kind: errorKindOf(error.code) }),
      GEOLOCATION_OPTIONS,
    );
  });
}
