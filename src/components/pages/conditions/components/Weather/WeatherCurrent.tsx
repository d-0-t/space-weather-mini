import "./WeatherCurrent.scss";
import CloudIcon from "@mui/icons-material/Cloud";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import type { WeatherData } from "../../../../../data/weather";
import { wmoWeather } from "../../../../../data/wmo-codes";
import { formatCelsius } from "../../utils/format";
import WeatherIcon from "./WeatherIcon";

/** Current conditions: temperature, humidity, total cloud with the low/mid/high split and the WMO code as icon plus text. */
const WeatherCurrent: React.FC<{ data: WeatherData }> = ({ data }) => {
  const { current } = data;
  const wmoText = wmoWeather(current.weatherCode).text;
  return (
    <div className="weather-current-wrap">
      <div className="weather-current">
        <p className="weather-current__main">
          <span title="Skyscape">
            <WeatherIcon code={current.weatherCode} />
            <span className="sr-only">{wmoText}</span>
          </span>
          <span className="weather-current__main__temp-wmo">
            <span className="weather-current__main__temp-wmo__temp">
              {formatCelsius(current.temperatureC)}
            </span>
            <span className="weather-current__main__temp-wmo__wmo">
              {wmoText}
            </span>
          </span>
        </p>
        <p className="weather-current__details">
          <span className="weather-current__details__detail" title="Humidity">
            <WaterDropIcon
              aria-hidden="true"
              fontSize="small"
              className="weather-current__details__icon"
            />
            <span className="sr-only">Humidity</span> {current.humidityPercent}%
          </span>{" "}
          <span
            className="weather-current__details__detail"
            title="Cloud coverage"
          >
            <CloudIcon
              aria-hidden="true"
              fontSize="small"
              className="weather-current__details__icon"
            />
            <span className="sr-only">Cloud coverage</span>{" "}
            {current.cloudCoverPercent}%
          </span>
          <span className="weather-current__detail weather-current__details--cloud-split">
            <span>low: {current.cloudLowPercent}%</span>
            <span>mid: {current.cloudMidPercent}%</span>
            <span>high: {current.cloudHighPercent}%</span>
          </span>
        </p>
      </div>
      {/* <div className="weather-current__legend" aria-label="Weather legend">
        <h3 className="weather-current__legend__heading">Legend</h3>
        <ul className="weather-current__legend__list">
          <li className="weather-current__legend__list__item">
            <CloudIcon aria-hidden="true" fontSize="small" />
            Skyscape
          </li>
          <li className="weather-current__legend__list__item">
            <WaterDropIcon aria-hidden="true" fontSize="small" /> Humidity
          </li>
          <li className="weather-current__legend__list__item">
            <CloudIcon aria-hidden="true" fontSize="small" /> Cloud coverage
          </li>
          <li className="weather-current__legend__list__item">
            at low / mid / high altitudes
          </li>
        </ul>
      </div> */}
    </div>
  );
};

export default WeatherCurrent;
