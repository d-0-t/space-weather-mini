import { describe, expect, it } from "vitest";

import {
  WORLD_LAND_URL,
  parseWorldLand,
  fetchWorldLand,
} from "./world-land";

const featureCollection = (geometry: unknown): string =>
  JSON.stringify({
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry }],
  });

describe("world-land", () => {
  it("serves the bundled Natural Earth asset from the same origin", () => {
    expect(WORLD_LAND_URL).toBe("/ne_110m_land.geojson");
    expect(WORLD_LAND_URL).not.toMatch(/^https?:/);
  });

  it("parses polygon rings from the FeatureCollection", () => {
    const rings = parseWorldLand(
      featureCollection({
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 0],
          ],
          [
            [2, 2],
            [4, 2],
            [4, 4],
            [2, 2],
          ],
        ],
      }),
    );
    expect(rings).toHaveLength(2);
    expect(rings[0][0]).toEqual([0, 0]);
    expect(rings[1]).toHaveLength(4);
  });

  it("drops degenerate rings but keeps the rest", () => {
    const rings = parseWorldLand(
      featureCollection({
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 1],
          ],
          [
            [0, 0],
            [5, 0],
            [5, 5],
            [0, 0],
          ],
        ],
      }),
    );
    expect(rings).toHaveLength(1);
    expect(rings[0][1]).toEqual([5, 0]);
  });

  it("rejects non-FeatureCollection payloads loudly", () => {
    expect(() => parseWorldLand("not json")).toThrow(
      "world land: payload is not JSON",
    );
    expect(() => parseWorldLand("{}")).toThrow(
      "world land: expected a FeatureCollection",
    );
    expect(() =>
      parseWorldLand(
        featureCollection({ type: "Point", coordinates: [0, 0] }),
      ),
    ).toThrow("world land: expected Polygon geometry");
  });

  it("rejects malformed points instead of painting NaN pixels", () => {
    const payload = JSON.stringify({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [[[0, 0], ["x", 1], [2, 2], [0, 0]]],
          },
        },
      ],
    });
    expect(() => parseWorldLand(payload)).toThrow(
      "world land: expected [lon, lat] pairs",
    );
  });

  it("rejects an empty world", () => {
    expect(() => parseWorldLand(featureCollection({ type: "Polygon", coordinates: [] })))
      .toThrow("world land: no polygon rings found");
  });

  it("fetches the bundled asset and parses it", async () => {
    const calls: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return {
        ok: true,
        text: async () =>
          featureCollection({
            type: "Polygon",
            coordinates: [[[0, 0], [5, 0], [5, 5], [0, 0]]],
          }),
      };
    }) as typeof fetch;
    try {
      const rings = await fetchWorldLand();
      expect(calls).toEqual([WORLD_LAND_URL]);
      expect(rings).toHaveLength(1);
    } finally {
      globalThis.fetch = original;
    }
  });

  it("surfaces HTTP failures with the status", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false,
      status: 404,
      text: async () => "",
    })) as unknown as typeof fetch;
    try {
      await expect(fetchWorldLand()).rejects.toThrow("world land: HTTP 404");
    } finally {
      globalThis.fetch = original;
    }
  });
});
