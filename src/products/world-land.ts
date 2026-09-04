/** Land polygons for the Oval glow basemap – Natural Earth 1:110m land. */

/** One coastline ring as [longitude, latitude] pairs; holes included. */
export type LandRing = Array<[number, number]>;

/** Bundled static asset (public domain); served from the same origin and
 * precached for offline shells by the PWA glob. */
export const WORLD_LAND_URL = "/ne_110m_land.geojson";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parses the Natural Earth land GeoJSON into fill rings. Only
 * `FeatureCollection` shells with `Polygon` geometries are accepted – the
 * bundled asset is exactly that, so anything else means a corrupted or
 * swapped asset and fails loudly instead of painting a broken world.
 */
export function parseWorldLand(payload: string): LandRing[] {
  let data: unknown;
  try {
    data = JSON.parse(payload);
  } catch {
    throw new Error("world land: payload is not JSON");
  }
  if (
    !isRecord(data) ||
    data.type !== "FeatureCollection" ||
    !Array.isArray(data.features)
  ) {
    throw new Error("world land: expected a FeatureCollection");
  }
  const rings: LandRing[] = [];
  for (const feature of data.features) {
    if (!isRecord(feature) || !isRecord(feature.geometry)) {
      throw new Error("world land: expected a geometry per feature");
    }
    const geometry = feature.geometry as {
      type?: unknown;
      coordinates?: unknown;
    };
    if (geometry.type !== "Polygon" || !Array.isArray(geometry.coordinates)) {
      throw new Error("world land: expected Polygon geometry");
    }
    for (const ring of geometry.coordinates) {
      if (!Array.isArray(ring)) {
        throw new Error("world land: expected an array ring");
      }
      const parsed: LandRing = ring.map((point) => {
        if (
          !Array.isArray(point) ||
          typeof point[0] !== "number" ||
          typeof point[1] !== "number"
        ) {
          throw new Error("world land: expected [lon, lat] pairs");
        }
        return [point[0], point[1]] as [number, number];
      });
      if (parsed.length >= 3) rings.push(parsed);
    }
  }
  if (rings.length === 0) {
    throw new Error("world land: no polygon rings found");
  }
  return rings;
}

/** Fetches and parses the bundled land asset. */
export async function fetchWorldLand(): Promise<LandRing[]> {
  const response = await fetch(WORLD_LAND_URL);
  if (!response.ok) {
    throw new Error(`world land: HTTP ${response.status}`);
  }
  return parseWorldLand(await response.text());
}
