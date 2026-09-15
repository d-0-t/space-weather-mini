import { useEffect, useMemo, useState } from "react";

import { REACH_CITIES } from "../../../../../data/reach-cities";
import { solarElevationDegrees } from "../../../../../data/sun";
import {
  selectReachTowns,
  type ReachTown,
} from "../../../../../products/reach-towns";

/**
 * Shared Reach towns selection: the towns in reach for a Kp value whose sun
 * sits at or below −12°, recomputed on a 60 s tick (the webcams pattern).
 * One hook for both the list and the Possible locations panel shell, so the
 * empty-vs-list decision and the rendered rows never disagree.
 */
export function useReachTowns(kp: number | null): ReachTown[] {
  // The sun state follows the clock on a 60 s tick; the Kp half rides the
  // caller's query.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => {
    if (kp === null) return [];
    return selectReachTowns(REACH_CITIES, kp, (entry) =>
      solarElevationDegrees(entry.lat, entry.lon, now),
    );
  }, [kp, now]);
}
