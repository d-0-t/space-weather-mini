import "./WeatherHourly.scss";
import { useId } from "react";
import type { WeatherData } from "../../../../../data/weather";
import { wmoWeather } from "../../../../../data/wmo-codes";
import { cloudSplitText, formatCelsius } from "../../utils/format";
import WeatherIcon from "./WeatherIcon";

/**
 * The 24 hour hourly strip: a horizontally scrollable row, one entry per
 * hour with time, temperature, humidity, total cloud with the low/mid/high
 * split and the WMO code as icon plus text.
 */
const WeatherHourly: React.FC<{ data: WeatherData }> = ({ data }) => {
  const stripLabelId = useId();
  return (
    <div className="conditions__hourly-block">
      <h3 className="sr-only" id={stripLabelId}>
        24-hour hourly strip
      </h3>
      <ul
        className="conditions__hourly"
        aria-labelledby={stripLabelId}
        // Keyboard access for the scrollable region (axe scrollable-region-focusable).
        tabIndex={0}
      >
        {data.hourly.map((hour) => (
          <li key={hour.time} className="conditions__hour">
            <span className="conditions__hour-time">{hour.time.slice(11)}</span>
            <span className="conditions__hour-main">
              <WeatherIcon code={hour.weatherCode} />
              <span className="conditions__hour-temp">
                {formatCelsius(hour.temperatureC)}
              </span>
            </span>
            <span className="conditions__hour-wmo">
              {wmoWeather(hour.weatherCode).text}
            </span>
            <span className="conditions__hour-detail">
              Humidity {hour.humidityPercent}%
            </span>
            <span className="conditions__hour-detail">
              {cloudSplitText(
                hour.cloudCoverPercent,
                hour.cloudLowPercent,
                hour.cloudMidPercent,
                hour.cloudHighPercent,
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WeatherHourly;
