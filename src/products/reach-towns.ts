/**
 * Reach towns – the ranked towns the Aurora now panel can name while the
 * current observed Kp puts them inside the aurora's reach (ticket 01
 * decision; CONTEXT.md "Reach towns"). Pure: eligibility, probability
 * band, dark gate, one-town-per-band-per-country dedup, ranking and the
 * render cap. The sun model is injected so the −12° gate and the ranking
 * are unit-pinned without a clock; the component passes the app's
 * `solarElevationDegrees` (data/sun.ts), recomputed on its 60 s tick.
 */

import type { ReachCity } from "../data/reach-cities";

/** The three ordinal probability bands, least to most confident. */
export type ReachProbability = "possible" | "likely" | "very-likely";

/** One ranked town: the reach margin and its probability band. */
export interface ReachTown {
  city: string;
  country: string;
  countryCode: string;
  /** |MLAT| − reach edge, in degrees; never negative in a result. */
  margin: number;
  probability: ReachProbability;
}

/**
 * The NOAA/SWPC Tips on Viewing the Aurora reach rule: the aurora reaches
 * down to E = 66° − 2° × Kp, in geomagnetic latitude. In-app convention:
 * the band edges below are the app's own (no source fixes per-band
 * thresholds); the reach rule itself is the source's.
 */
export const REACH_EDGE_BASE = 66;
export const REACH_EDGE_PER_KP = 2;

/** The most rows the element renders so the panel stays scannable. */
export const REACH_TOWNS_LIMIT = 12;

/** The sun at or below −12° is astronomical twilight or darker. */
export const DARK_ALTITUDE = -12;

/** The Tips reach edge for a Kp value, in geomagnetic latitude. */
export function reachEdge(kp: number): number {
  return REACH_EDGE_BASE - REACH_EDGE_PER_KP * kp;
}

/**
 * The probability band for a reach margin d = |MLAT| − E, or null when
 * the town is equatorward of the edge: 0 ≤ d < 2 Possible (at the edge of
 * reach), 2 ≤ d < 6 Likely, d ≥ 6 Very likely. Ordinal words only – no
 * percentages (N10).
 */
export function probabilityBand(margin: number): ReachProbability | null {
  if (margin < 0) return null;
  if (margin < 2) return "possible";
  if (margin < 6) return "likely";
  return "very-likely";
}

/**
 * True when the sun is at or below −12° at the town – astronomical
 * twilight or Night per CONTEXT.md, the darkest bands only. Bright
 * twilight never counts; a town in daylight is never named.
 */
export function isDarkForAurora(elevationDegrees: number): boolean {
  return elevationDegrees <= DARK_ALTITUDE;
}

/** Band order for the rendered list: most confident first. */
const PROBABILITY_ORDER: Record<ReachProbability, number> = {
  "very-likely": 0,
  likely: 1,
  possible: 2,
};

/**
 * The ranked Reach towns for one instant: towns at or poleward of the
 * Tips edge whose sun is at or below −12°, at most one per band per
 * country (largest margin wins, ties alphabetical), ordered by band,
 * then margin descending, then city name, and capped at
 * `REACH_TOWNS_LIMIT` rows. `sunElevationDegrees` is the injected solar
 * model (the component passes data/sun.ts); a town in daylight or bright
 * twilight never appears.
 */
export function selectReachTowns(
  cities: readonly ReachCity[],
  kp: number,
  sunElevationDegrees: (city: ReachCity) => number,
): ReachTown[] {
  const edge = reachEdge(kp);
  const bestPerBandAndCountry = new Map<string, ReachTown>();
  for (const entry of cities) {
    const margin = Math.abs(entry.mlat) - edge;
    const probability = probabilityBand(margin);
    if (probability === null) continue;
    if (!isDarkForAurora(sunElevationDegrees(entry))) continue;
    const town: ReachTown = {
      city: entry.city,
      country: entry.country,
      countryCode: entry.countryCode,
      margin,
      probability,
    };
    const key = `${probability}/${entry.country}`;
    const current = bestPerBandAndCountry.get(key);
    if (
      !current ||
      town.margin > current.margin ||
      (town.margin === current.margin &&
        town.city.localeCompare(current.city) < 0)
    ) {
      bestPerBandAndCountry.set(key, town);
    }
  }
  return [...bestPerBandAndCountry.values()]
    .sort(
      (a, b) =>
        PROBABILITY_ORDER[a.probability] - PROBABILITY_ORDER[b.probability] ||
        b.margin - a.margin ||
        a.city.localeCompare(b.city),
    )
    .slice(0, REACH_TOWNS_LIMIT);
}
