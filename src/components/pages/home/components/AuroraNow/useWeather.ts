import { useQuery } from "@tanstack/react-query";

import type { GeocodedPlace } from "../../../../../data/place-storage";
import { fetchWeather } from "../../../../../data/weather";

/**
 * One shared Open-Meteo weather subscription for the Home place surfaces
 * (the current-weather one-liner and the interpreter's sky line): the same
 * query key dedupes the fetch, and the cache discipline lives here – one
 * call per place change, no polling, no refetch on focus (ADR 0005).
 */
export function useWeather(place: GeocodedPlace) {
  return useQuery({
    queryKey: ["open-meteo-weather", place.latitude, place.longitude],
    queryFn: () => fetchWeather(place.latitude, place.longitude),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
