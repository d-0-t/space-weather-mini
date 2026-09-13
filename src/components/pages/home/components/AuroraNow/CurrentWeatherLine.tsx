import { Link } from "react-router-dom";

import type { GeocodedPlace } from "../../../../../data/place-storage";
import {
  darkestWindow,
  daylightTimes,
  type DarkestBand,
} from "../../../../../data/sun";
import { wmoWeather } from "../../../../../data/wmo-codes";
import { formatClock } from "../../../../../products/display-time";
import { useDisplayTimezone } from "../../../../DisplayTimezone/DisplayTimezoneContext";
import { formatCelsius } from "../../../../weather/format";
import WeatherIcon from "../../../../weather/WeatherIcon";
import { useWeather } from "./useWeather";

import "./CurrentWeatherLine.scss";

/** Lowercase band names for the "Darkest window (…)" label. */
const DARKEST_BAND_LABEL: Record<DarkestBand, string> = {
  night: "night",
  "astronomical-twilight": "astronomical twilight",
  "nautical-twilight": "nautical twilight",
  "civil-twilight": "civil twilight",
};

/**
 * The local-sky one-liner under the location / Aurora-likeliness line: the
 * sky-condition icon (its WMO text only for screen readers), the
 * temperature and the total cloud coverage – no humidity, no low/mid/high
 * split – plus the darkest window at the place ("Darkest window (night):
 * 22:38 to 02:23.", or the deepest twilight band the day reaches) and the
 * Local conditions link. It shares the weather subscription with the
 * interpreter, so a place picked in the Change location modal refetches the
 * weather once. Hidden while the weather has not loaded – the panel never
 * blocks on it.
 */
const CurrentWeatherLine: React.FC<{ place: GeocodedPlace }> = ({ place }) => {
  const { displayTimezone } = useDisplayTimezone();
  const query = useWeather(place);
  if (!query.data) return null;
  const { current } = query.data;
  const darkest = darkestWindow(
    daylightTimes(place.latitude, place.longitude, new Date()),
  );
  const darkestText =
    darkest.kind === "polar-day"
      ? "Polar day."
      : darkest.kind === "all-dark"
        ? "Darkest (night): all day."
        : `Darkest (${DARKEST_BAND_LABEL[darkest.band]}): ${formatClock(
            darkest.start,
            displayTimezone,
          )} to ${formatClock(darkest.end, displayTimezone)}.`;
  return (
    <p className="weather-line">
      <span className="weather-line__conditions">
        <WeatherIcon code={current.weatherCode} />
        <span className="weather-line__conditions__temp">
          {formatCelsius(current.temperatureC)},
        </span>
        <span>{wmoWeather(current.weatherCode).text.toLocaleLowerCase()},</span>
        <span className="weather-line__conditions__cloud">
          {current.cloudCoverPercent}% cloud.
        </span>
      </span>
      <span className="weather-line__darkest">{darkestText}</span>
      <Link className="weather-line__link" to="/conditions">
        Local conditions →
      </Link>
    </p>
  );
};

export default CurrentWeatherLine;
