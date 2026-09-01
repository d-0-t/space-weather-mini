import "./WeatherDaily.scss";
import { useId } from "react";
import type { GeocodedPlace } from "../../../../../data/place-storage";
import type { WeatherData } from "../../../../../data/weather";
import { wmoWeather } from "../../../../../data/wmo-codes";
import { formatCelsius } from "../../utils/format";
import WeatherIcon from "./WeatherIcon";

/** The 3 day daily row as a semantic table: one card per day with max and min, WMO icon and text and sunrise and sunset for reference. */
const WeatherDaily: React.FC<{ data: WeatherData; place: GeocodedPlace }> = ({
  data,
  place,
}) => {
  const tableLabelId = useId();
  return (
    <div
      className="conditions__daily-scroll"
      role="region"
      aria-labelledby={tableLabelId}
      // Keyboard access for the scrollable table region on narrow screens
      // (scrollable-region-focusable); named by the sr-only span below.
      tabIndex={0}
    >
      <span className="sr-only" id={tableLabelId}>
        3-day weather forecast table, scrollable
      </span>
      <table className="conditions__daily">
        <caption>3-day weather forecast at {place.displayName}</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Conditions</th>
            <th scope="col">Max</th>
            <th scope="col">Min</th>
            <th scope="col">Sunrise</th>
            <th scope="col">Sunset</th>
          </tr>
        </thead>
        <tbody>
          {data.daily.map((day) => (
            <tr key={day.date}>
              <td>{day.date}</td>
              <td>
                <WeatherIcon code={day.weatherCode} />
                <span className="conditions__daily-wmo">
                  {wmoWeather(day.weatherCode).text}
                </span>
              </td>
              <td>{formatCelsius(day.temperatureMaxC)}</td>
              <td>{formatCelsius(day.temperatureMinC)}</td>
              <td>{day.sunrise.slice(11)}</td>
              <td>{day.sunset.slice(11)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WeatherDaily;
