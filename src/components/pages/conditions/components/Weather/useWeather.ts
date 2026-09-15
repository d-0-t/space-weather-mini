import { useQuery } from "@tanstack/react-query";
import type { GeocodedPlace } from "../../../../../data/place-storage";
import { fetchWeather } from "../../../../../data/weather";
import { loadWeather, saveWeather } from "../../../../../data/weather-storage";

/**
 * Shared Open-Meteo query for the geocoded place (dashboard-layout ticket
 * 03): one fetch per place, deduplicated by TanStack Query across the
 * Weather and Three-day weather forecast sections via the shared query key.
 * The last fetched payload persists, so an offline reload hydrates the
 * saved weather with its true fetch instant. Refresh stays manual-only: no
 * polling and no refetch on focus (ADR 0003 exception, ADR 0005).
 */
export const useWeather = (place: GeocodedPlace) => {
  const persisted = loadWeather(localStorage, place.latitude, place.longitude);
  return useQuery({
    queryKey: ["open-meteo-weather", place.latitude, place.longitude],
    queryFn: () =>
      fetchWeather(place.latitude, place.longitude).then((data) => {
        saveWeather(localStorage, place.latitude, place.longitude, data);
        return data;
      }),
    // The cache is shown between manual refreshes; every refetch trigger
    // except the Refresh tap is off, so one call per place change plus user
    // pulls is all the free tier ever sees.
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    // The saved payload enters as (dated) initial data: older than the
    // staleness window it triggers the mount refetch exactly like an
    // in-memory cache would, and a failed offline refetch still shows it.
    initialData: persisted ?? undefined,
    initialDataUpdatedAt: persisted
      ? new Date(persisted.fetchedAt).getTime()
      : undefined,
  });
};
