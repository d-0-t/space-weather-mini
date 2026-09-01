import "./WeatherBlock.scss";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useQuery } from "@tanstack/react-query";
import type { GeocodedPlace } from "../../../../../data/place-storage";
import { fetchWeather } from "../../../../../data/weather";
import { formatTime } from "../../utils/format";
import WeatherCurrent from "./WeatherCurrent";
import WeatherDaily from "./WeatherDaily";
import WeatherHourly from "./WeatherHourly";

/**
 * Weather for the geocoded place (ticket 03): current conditions, a 24 hour
 * horizontally scrolling hourly strip and a 3 day daily row from one
 * Open-Meteo fetch, refreshed only on the always-enabled Refresh tap – no
 * polling and no refetch on focus (ADR 0003 exception, ADR 0005). Failure
 * swaps only this block to a plain retryable error; the place and daylight
 * stay visible.
 */
const WeatherBlock: React.FC<{ place: GeocodedPlace }> = ({ place }) => {
  const query = useQuery({
    queryKey: ["open-meteo-weather", place.latitude, place.longitude],
    queryFn: () => fetchWeather(place.latitude, place.longitude),
    // The cache is shown between manual refreshes; every refetch trigger
    // except the Refresh tap is off, so one call per place change plus user
    // pulls is all the free tier ever sees.
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const { data, isPending, isError, refetch } = query;
  return (
    <section className="conditions__weather">
      <div className="conditions__weather-header">
        <h2>Weather</h2>
        <button
          type="button"
          className="btn--secondary"
          title="Refresh"
          onClick={() => void refetch()}
        >
          <RefreshIcon fontSize="small" aria-hidden="true" />
          <span className="btn__label">Refresh</span>
        </button>
      </div>
      {data ? (
        <>
          <p className="conditions__weather-fetched">
            Data from Open-Meteo at {formatTime(new Date(data.fetchedAt))} local
          </p>
          {isError ? (
            <p className="conditions__status" role="status">
              Couldn't refresh the weather – showing the last data.
            </p>
          ) : null}
          <WeatherCurrent data={data} />
          <WeatherHourly data={data} />
          <WeatherDaily data={data} place={place} />
        </>
      ) : isPending ? (
        <p className="conditions__status" aria-busy="true">
          Loading weather…
        </p>
      ) : (
        <p className="conditions__status">
          Couldn't load the weather – check back later.
        </p>
      )}
    </section>
  );
};

export default WeatherBlock;
