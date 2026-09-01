import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createGeocodingClient,
  getDeviceLocation,
  mapNominatimSearchResponse,
  mapNominatimReverseResponse,
  type SearchResult,
} from "./geocoding";
import kirunaFixture from "./fixtures/nominatim-kiruna.json";
import springfieldFixture from "./fixtures/nominatim-springfield.json";
import reverseTromsoFixture from "./fixtures/nominatim-reverse-tromso.json";
import {
  jsonResponse,
  restoreGeolocation,
  stubGeolocation,
} from "../test/nominatim-test-utils";

describe("Nominatim response mapping (ticket 02)", () => {
  it("maps a real search response into typed matches with numeric coordinates", () => {
    const matches = mapNominatimSearchResponse(kirunaFixture);
    expect(matches).toHaveLength(2);
    expect(matches[0]).toEqual({
      displayName: "Kiruna, Kiruna kommun, Norrbottens län, 981 30, Sverige",
      latitude: 67.8496111,
      longitude: 20.30625,
    });
    expect(matches[1].displayName).toBe("Kiruna kommun, Norrbottens län, Sverige");
  });

  it("keeps up to five matches by display name", () => {
    const matches = mapNominatimSearchResponse(springfieldFixture);
    expect(matches).toHaveLength(5);
    expect(matches.map((m) => m.displayName)).toContain(
      "Springfield, Sangamon County, Illinois, United States",
    );
  });

  it("skips entries without a display name or unparseable coordinates", () => {
    const matches = mapNominatimSearchResponse([
      { display_name: "Good", lat: "59.91", lon: "10.75" },
      { display_name: "", lat: "59.91", lon: "10.75" },
      { display_name: "No lat", lon: "10.75" },
      { display_name: "Bad lat", lat: "north", lon: "10.75" },
      { display_name: "Out of range", lat: "91", lon: "10.75" },
      { display_name: "No lon", lat: "59.91" },
    ]);
    expect(matches).toEqual([
      { displayName: "Good", latitude: 59.91, longitude: 10.75 },
    ]);
  });

  it("accepts numeric coordinates alongside the usual strings", () => {
    const matches = mapNominatimSearchResponse([
      { display_name: "Numeric", lat: 67.85, lon: 20.22 },
    ]);
    expect(matches).toEqual([
      { displayName: "Numeric", latitude: 67.85, longitude: 20.22 },
    ]);
  });

  it("returns no matches for a non-array payload", () => {
    expect(mapNominatimSearchResponse(null)).toEqual([]);
    expect(mapNominatimSearchResponse({ display_name: "x" })).toEqual([]);
  });

  it("maps a real reverse response into one typed match", () => {
    const match = mapNominatimReverseResponse(reverseTromsoFixture);
    expect(match).toEqual({
      displayName: "Storgata, Nerstranda, Sørbyen, Tromsø, Troms, 9008, Norge",
      latitude: 69.6491081,
      longitude: 18.9553774,
    });
  });

  it("returns null for a reverse response without a display name", () => {
    expect(mapNominatimReverseResponse({ lat: "1", lon: "2" })).toBeNull();
    expect(mapNominatimReverseResponse(null)).toBeNull();
  });
});

describe("Nominatim search client (ticket 02)", () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const client = (): ReturnType<typeof createGeocodingClient> =>
    createGeocodingClient(fetchMock);

  it("queries only on explicit submit with the documented params", async () => {
    fetchMock.mockResolvedValue(jsonResponse(springfieldFixture));
    const result = await client().search("Springfield");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe("https://nominatim.openstreetmap.org/search");
    expect(url.searchParams.get("format")).toBe("jsonv2");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.get("addressdetails")).toBe("1");
    expect(url.searchParams.get("q")).toBe("Springfield");
    expect(result).toEqual({ status: "ok", matches: expect.any(Array) });
  });

  it("sends the browser language as accept-language and a referrer naming the app", async () => {
    fetchMock.mockResolvedValue(jsonResponse(kirunaFixture));
    await client().search("Kiruna");
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("accept-language")).toBe(navigator.language);
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.referrer).toBe(location.origin);
  });

  it("encodes the freeform query", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await client().search("Tromsø, Norway");
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("q")).toBe("Tromsø, Norway");
  });

  it("returns ok with up to five matches", async () => {
    fetchMock.mockResolvedValue(jsonResponse(springfieldFixture));
    const result = (await client().search(
      "Springfield",
    )) as Extract<SearchResult, { status: "ok" }>;
    expect(result.status).toBe("ok");
    expect(result.matches).toHaveLength(5);
  });

  it("dedups repeated queries by trimmed lowercased query with one fetch", async () => {
    fetchMock.mockResolvedValue(jsonResponse(springfieldFixture));
    const c = client();
    await c.search("  Springfield ");
    await c.search("springfield");
    await c.search("SPRINGFIELD");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throttles different queries to at most one per second", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T12:00:00Z"));
    fetchMock.mockResolvedValue(jsonResponse(kirunaFixture));
    const c = client();
    const first = c.search("Kiruna");
    await vi.advanceTimersByTimeAsync(0);
    await first;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const second = c.search("Luleå");
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await second;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("surfaces 429 as busy with the RetryAfter seconds when present", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({}, 429).withRetryAfter(5),
    );
    const result = (await client().search(
      "Kiruna",
    )) as Extract<SearchResult, { status: "busy" }>;
    expect(result.status).toBe("busy");
    expect(result.retryAfterSeconds).toBe(5);
  });

  it("surfaces 429 as busy with null RetryAfter when the header is absent", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 429));
    const result = (await client().search(
      "Kiruna",
    )) as Extract<SearchResult, { status: "busy" }>;
    expect(result.status).toBe("busy");
    expect(result.retryAfterSeconds).toBeNull();
  });

  it("extends the throttle window to the RetryAfter after a 429", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T12:00:00Z"));
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 429).withRetryAfter(5))
      .mockResolvedValue(jsonResponse(kirunaFixture));
    const c = client();
    await c.search("Kiruna");
    vi.setSystemTime(new Date("2026-09-01T12:00:02Z"));
    const second = c.search("Luleå");
    await vi.advanceTimersByTimeAsync(2999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await second;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports no-match for an empty result array", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    const result = await client().search("zzz nowhere");
    expect(result).toEqual({ status: "no-match" });
  });

  it("reports failed on a network rejection", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const result = await client().search("Kiruna");
    expect(result).toEqual({ status: "failed" });
  });

  it("reports failed on a non-429 server error", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500));
    const result = await client().search("Kiruna");
    expect(result).toEqual({ status: "failed" });
  });

  it("never caches busy or failed outcomes so the same query can retry honestly", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T12:00:00Z"));
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 429).withRetryAfter(5))
      .mockResolvedValueOnce(jsonResponse(kirunaFixture));
    const c = client();
    const busy = await c.search("Kiruna");
    expect(busy).toEqual({ status: "busy", retryAfterSeconds: 5 });
    // A retry of the same query must go to the network again, not return
    // the cached busy: the RetryAfter window waits it out, then succeeds.
    vi.setSystemTime(new Date("2026-09-01T12:00:06Z"));
    const retry = c.search("  KIRUNA ");
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await retry).toEqual({ status: "ok", matches: expect.any(Array) });
  });

  it("reverse geocodes coordinates into a match with the documented params", async () => {
    fetchMock.mockResolvedValue(jsonResponse(reverseTromsoFixture));
    const result = await client().reverse(69.6492, 18.9553);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe("https://nominatim.openstreetmap.org/reverse");
    expect(url.searchParams.get("format")).toBe("jsonv2");
    expect(url.searchParams.get("lat")).toBe("69.6492");
    expect(url.searchParams.get("lon")).toBe("18.9553");
    expect(result).toEqual({
      displayName: "Storgata, Nerstranda, Sørbyen, Tromsø, Troms, 9008, Norge",
      latitude: 69.6491081,
      longitude: 18.9553774,
    });
  });

  it("returns null from reverse on failure", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    expect(await client().reverse(1, 2)).toBeNull();
  });
});

describe("Browser geolocation (ticket 02)", () => {
  afterEach(() => {
    restoreGeolocation();
  });

  it("resolves the device coordinates on success", async () => {
    stubGeolocation({ kind: "ok", latitude: 69.6492, longitude: 18.9553 });
    expect(await getDeviceLocation()).toEqual({
      status: "ok",
      latitude: 69.6492,
      longitude: 18.9553,
    });
  });

  it("maps permission denied to the denied error kind", async () => {
    stubGeolocation({ kind: "error", code: 1 });
    expect(await getDeviceLocation()).toEqual({ status: "error", kind: "denied" });
  });

  it("maps timeout to the timeout error kind", async () => {
    stubGeolocation({ kind: "error", code: 3 });
    expect(await getDeviceLocation()).toEqual({ status: "error", kind: "timeout" });
  });

  it("maps position unavailable to the unavailable error kind", async () => {
    stubGeolocation({ kind: "error", code: 2 });
    expect(await getDeviceLocation()).toEqual({
      status: "error",
      kind: "unavailable",
    });
  });

  it("requests a single shot with high accuracy and a short timeout", async () => {
    const getCurrentPosition = stubGeolocation({
      kind: "ok",
      latitude: 1,
      longitude: 2,
    });
    await getDeviceLocation();
    const options = getCurrentPosition.mock.calls[0][2];
    expect(options).toEqual({
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 60000,
    });
  });
});