import { useEffect, useState } from "react";

import { formatUtcShort } from "../../../../../products/live-helpers";

/** Honest stale copy for every live card when its data cannot be reached. */
export const STALE_DATA_NOTICE =
  "⚠ Showing saved data – couldn't reach NOAA";

/** Honest error copy for a live card that has never loaded any data. */
export const COULDNT_LOAD_COPY = "Couldn't load – connect to refresh";

/**
 * The honesty state of a live card: showing fresh data (null), stale saved
 * data (stale), or nothing ever loaded (never-loaded).
 */
export type LiveDataState = "stale" | "never-loaded" | null;

/**
 * Derives a live card's honesty state from its query and the network state.
 * `stale` covers both a genuine fetch error with cached data and the offline
 * case (the Service Worker answers from cache, so a fetch may still resolve –
 * the notice has to come from the network state too). `never-loaded` only
 * fires when the query really failed; a query still loading its cached data
 * offline must not flash the error first.
 */
export function liveDataState(
  query: { isError: boolean; data?: unknown },
  offline: boolean,
): LiveDataState {
  if (query.isError && !query.data) return "never-loaded";
  if ((query.isError || offline) && Boolean(query.data)) return "stale";
  return null;
}

/**
 * Tracks the browser's online/offline state so live cards can say honestly
 * that the data on screen is saved rather than live. The Service Worker
 * answers offline requests from cache, so a fetch may still resolve – the
 * stale notice has to come from the network state, not from fetch rejection.
 */
export function useIsOffline(): boolean {
  const [offline, setOffline] = useState(() => !navigator.onLine);
  useEffect(() => {
    const goOffline = (): void => setOffline(true);
    const goOnline = (): void => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);
  return offline;
}

/** aria-live warning ("⚠ Showing saved data…") on every live card. */
export const StaleDataNotice: React.FC = () => (
  <p className="live-panel__warning" aria-live="polite">
    {STALE_DATA_NOTICE}
  </p>
);

/** Honest freshness line: "As of {time} • Updated {age}". */
export const FreshnessLine: React.FC<{
  asOf: string;
  updated: string;
}> = ({ asOf, updated }) => (
  <p className="live-panel__fresh">
    As of {formatUtcShort(asOf)} • Updated {updated}
  </p>
);