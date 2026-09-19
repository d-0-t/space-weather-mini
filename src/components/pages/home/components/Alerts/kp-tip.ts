/**
 * The one-line tip beside the Kp alert threshold slider (ticket 06): the
 * Kp that typically brings the aurora oval to the stored geocoded place,
 * computed from the place's approximate geomagnetic latitude through the
 * Tips reach rule's own `reachEdge` (the Possible locations panel's seam,
 * never a fork) and inverted – the smallest integer Kp whose reach edge
 * sits at or equatorward of the place's |MLAT|, clamped to the slider's
 * 1–9 range. The copy hedges: "typically", never a per-place promise
 * (honesty bounds N3/N10). Null without a stored place; the generic
 * fallback copy is the UI's.
 */

import { approxGeomagneticLatitude } from "../../../../../data/reach-cities";
import { reachEdge } from "../../../../../products/reach-towns";

/** The stored place the tip speaks about (the shape the sender stores). */
export interface TipPlace {
  latitude: number;
  longitude: number;
  /** The geocoded place's short name, e.g. "Luleå". */
  shortName: string;
}

/**
 * The tip line for the stored place, or null when no place is stored:
 * "Kp 2 typically brings the oval to Luleå." – or, for places even Kp 9's
 * reach edge never reaches, the honest "Even Kp 9 rarely brings the oval
 * to {place}."
 */
export function kpTip(place: TipPlace | null): string | null {
  if (!place) return null;
  const mlat = Math.abs(
    approxGeomagneticLatitude(place.latitude, place.longitude),
  );
  for (let kp = 1; kp <= 9; kp += 1) {
    if (reachEdge(kp) <= mlat) {
      return `Kp ${kp} typically brings the oval to ${place.shortName}.`;
    }
  }
  return `Even Kp 9 rarely brings the oval to ${place.shortName}.`;
}
