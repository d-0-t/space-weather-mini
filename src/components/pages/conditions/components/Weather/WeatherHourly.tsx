import "./WeatherHourly.scss";
import CloudIcon from "@mui/icons-material/Cloud";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import { useId } from "react";
import type { WeatherData } from "../../../../../data/weather";
import { wmoWeather } from "../../../../../data/wmo-codes";
import { formatCelsius } from "../../utils/format";
import WeatherIcon from "./WeatherIcon";

/**
 * The 24 hour hourly strip: a horizontally scrollable row, one entry per
 * hour with time, temperature, humidity, total cloud with the low/mid/high
 * split and the WMO code as icon plus text.
 */
const WeatherHourly: React.FC<{ data: WeatherData }> = ({ data }) => {
  const stripLabelId = useId();
  return (
    <div className="weather-hourly">
      <h3 className="sr-only" id={stripLabelId}>
        24-hour hourly strip
      </h3>
      <ul
        className="weather-hourly__hourly"
        aria-labelledby={stripLabelId}
        // Keyboard access for the scrollable region (axe scrollable-region-focusable).
        tabIndex={0}
      >
        {data.hourly.map((hour) => {
          const wmoText = wmoWeather(hour.weatherCode).text;
          return (
            <li key={hour.time} className="weather-hourly__hour">
              <span className="weather-hourly__hour__time">
                {hour.time.slice(11)}
              </span>
              <span className="weather-hourly__hour__main">
                <WeatherIcon code={hour.weatherCode} />{" "}
                {/** sr-only span is not needed here because wmoText is shown below */}
                <span className="weather-hourly__hour__main__temp">
                  {formatCelsius(hour.temperatureC)}
                </span>
              </span>
              <span className="weather-hourly__hour__wmo">{wmoText}</span>
              <span className="weather-hourly__hour__detail">
                <WaterDropIcon aria-hidden="true" fontSize="inherit" />
                <span className="sr-only">Humidity</span> {hour.humidityPercent}
                %
              </span>
              <span className="weather-hourly__hour__detail">
                <CloudIcon aria-hidden="true" fontSize="inherit" />
                <span className="sr-only">Cloud coverage</span>{" "}
                {hour.cloudCoverPercent}%
              </span>
              {/* <span className="weather-hourly__hour__detail weather-hourly__hour__detail--cloud-split">
                <span>low {hour.cloudLowPercent}%</span>
                <span>mid {hour.cloudMidPercent}%</span>
                <span>high {hour.cloudHighPercent}%</span>
              </span> */}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default WeatherHourly;
