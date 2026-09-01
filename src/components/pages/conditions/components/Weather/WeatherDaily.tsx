import "./WeatherDaily.scss";
// import { useId } from "react";
import type { GeocodedPlace } from "../../../../../data/place-storage";
import type { WeatherData } from "../../../../../data/weather";
import { wmoWeather } from "../../../../../data/wmo-codes";
import { formatCelsius } from "../../utils/format";
// import { flagSrc } from "../../../webcams/webcam-card-parts";
// import { shortPlace } from "../../utils/short-display-name";
import WeatherIcon from "./WeatherIcon";

/** The 3 day daily row as a semantic table: one card per day with max and min, WMO icon and text and sunrise and sunset for reference. */
const WeatherDaily: React.FC<{ data: WeatherData; place: GeocodedPlace }> = ({
  data,
  place,
}) => {
  //const { shortName, country, countryCode } = shortPlace(place);
  return (
    <div
      className="weather-daily"
      role="region"
      // Keyboard access for the scrollable table region on narrow screens
      // (scrollable-region-focusable); named by the sr-only span below.
      tabIndex={0}
    >
      <h3>3-day weather forecast</h3>
      <table>
        <caption title={place.displayName}>
          {" "}
          <span className="sr-only">3-day weather forecast</span>
          {/*  at{" "}
          {countryCode ? (
            <img
              className="weather-daily__flag"
              src={flagSrc(countryCode, "16x12")}
              srcSet={`${flagSrc(countryCode, "32x24")} 2x, ${flagSrc(countryCode, "48x36")} 3x`}
              width={16}
              height={12}
              alt={country}
              title={country}
              loading="lazy"
            />
          ) : null}{" "}
          {shortName} */}
        </caption>
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
                <span className="weather-daily__wmo">
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
