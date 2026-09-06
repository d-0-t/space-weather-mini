import { useQuery } from "@tanstack/react-query";

import {
  OVATION_QUERY_KEY,
  OVATION_REFETCH_IN_BACKGROUND,
  OVATION_REFETCH_INTERVAL_MS,
  OVATION_STALE_TIME_MS,
  fetchOvation,
} from "../../../../../products/ovation";

/**
 * One live Oval grid subscription shared by the oval map and the View
 * distance line: the same query key dedupes the fetch, and the polling
 * discipline (5 min, never in background) lives here.
 */
export function useOvationQuery() {
  return useQuery({
    queryKey: [...OVATION_QUERY_KEY],
    queryFn: fetchOvation,
    refetchInterval: OVATION_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: OVATION_REFETCH_IN_BACKGROUND,
    staleTime: OVATION_STALE_TIME_MS,
    gcTime: 10 * 60 * 1000,
  });
}
