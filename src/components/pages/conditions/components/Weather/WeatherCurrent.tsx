import "./WeatherCurrent.scss";
import type { WeatherData } from "../../../../../data/weather";
import { wmoWeather } from "../../../../../data/wmo-codes";
import { cloudSplitText, formatCelsius } from "../../utils/format";
import WeatherIcon from "./WeatherIcon";

/** Current conditions: temperature, humidity, total cloud with the low/mid/high split and the WMO code as icon plus text. */
const WeatherCurrent: React.FC<{ data: WeatherData }> = ({ data }) => {
  const { current } = data;
  return (
    <div className="conditions__current">
      <p className="conditions__current-main">
        <WeatherIcon code={current.weatherCode} />
        <span className="conditions__current-temp">
          {formatCelsius(current.temperatureC)}
        </span>
        <span className="conditions__current-wmo">
          {wmoWeather(current.weatherCode).text}
        </span>
      </p>
      <p className="conditions__current-details">
        Humidity {current.humidityPercent}% ·{" "}
        {cloudSplitText(
          current.cloudCoverPercent,
          current.cloudLowPercent,
          current.cloudMidPercent,
          current.cloudHighPercent,
        )}
      </p>
    </div>
  );
};

export default WeatherCurrent;
