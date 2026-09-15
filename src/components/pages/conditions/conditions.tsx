import "./conditions.scss";
import { daylightTimes } from "../../../data/sun";
import PlaceFinder from "../../PlaceFinder/PlaceFinder";
import { useGeocodedPlace } from "../../PlaceFinder/useGeocodedPlace";
import DayBlock from "./components/DayBlock/DayBlock";
import ExternalLinks from "./components/ExternalLinks/ExternalLinks";
import ThreeDayForecast from "./components/ThreeDayForecast/ThreeDayForecast";
import WeatherBlock from "./components/Weather/WeatherBlock";

/**
 * Local conditions – daylight for the stored geocoded place, derived on
 * device with suncalc (ADR 0005). No network call happens for solar times;
 * the place is the one shared geocoded place (default Luleå, Sweden)
 * and the header button opens the same Change location modal as Home.
 *
 * Dashboard-layout ticket 03: the four sections stack daylight, Weather,
 * Three-day weather forecast, External maps on narrow widths and reflow to two
 * independent flex columns at lg (daylight plus external maps left,
 * Weather plus Three-day weather forecast right). Each column stacks its own
 * sections with a uniform gap, so uneven card heights never leave ragged
 * whitespace. DOM order is the column grouping; below lg the columns
 * dissolve (display: contents) and CSS order restores the mobile visual
 * stack (daylight, Weather, Three-day weather forecast, External maps), while
 * screen readers and keyboards follow the DOM column grouping – each
 * story stays independent behind its own heading, so meaning is
 * preserved either way.
 */
const LocalConditions: React.FC = () => {
  const { place, pick } = useGeocodedPlace();
  const { today } = daylightTimes(place.latitude, place.longitude, new Date());
  return (
    <div className="container conditions">
      <div className="conditions__header">
        <h1>Local conditions</h1>
        <PlaceFinder place={place} onPick={pick} />
      </div>
      <div className="conditions__grid">
        <div className="conditions__col conditions__col--left">
          <DayBlock heading="Today's daylight chart" day={today} />
          <ExternalLinks place={place} />
        </div>
        <div className="conditions__col conditions__col--right">
          <WeatherBlock place={place} />
          <ThreeDayForecast place={place} />
        </div>
      </div>
    </div>
  );
};

export default LocalConditions;
