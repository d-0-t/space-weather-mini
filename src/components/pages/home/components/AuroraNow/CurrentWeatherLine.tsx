import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import type { GeocodedPlace } from "../../../../../data/place-storage";
import { fetchWeather } from "../../../../../data/weather";
import { wmoWeather } from "../../../../../data/wmo-codes";
import { formatCelsius } from "../../../../weather/format";
import WeatherIcon from "../../../../weather/WeatherIcon";

import "./CurrentWeatherLine.scss";

/**
 * The current-weather one-liner under the location / Aurora-likeliness
 * line: the sky-condition icon (its WMO text only for screen readers),
 * the temperature and the total cloud coverage – no humidity, no
 * low/mid/high split – plus the Local conditions link. It shares the Local
 * conditions weather query (the same TanStack key over lat/lon), so a
 * place picked in the Change location modal refetches the weather along
 * with the band line, and a fetch already made on the conditions page
 * warms this line. Hidden while the weather has not loaded – the panel
 * never blocks on it.
 */
const CurrentWeatherLine: React.FC<{ place: GeocodedPlace }> = ({ place }) => {
  const query = useQuery({
    queryKey: ["open-meteo-weather", place.latitude, place.longitude],
    queryFn: () => fetchWeather(place.latitude, place.longitude),
    // The same cache discipline as the Local conditions weather block
    // (ADR 0005): one call per place change, plus the Refresh taps there.
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  if (!query.data) return null;
  const { current } = query.data;
  return (
    <p className="weather-line">
      <span className="weather-line__conditions">
        <WeatherIcon code={current.weatherCode} />
        <span className="weather-line__conditions__temp">
          {formatCelsius(current.temperatureC)},
        </span>
        <span>{wmoWeather(current.weatherCode).text.toLocaleLowerCase()},</span>
        <span className="weather-line__conditions__cloud">
          {current.cloudCoverPercent}% clouds.
        </span>
      </span>
      <Link className="weather-line__link" to="/conditions">
        Local conditions →
      </Link>
    </p>
  );
};

export default CurrentWeatherLine;
