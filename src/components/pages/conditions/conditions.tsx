import "./conditions.scss";
import { daylightTimes } from "../../../data/sun";
import PlaceFinder from "../../PlaceFinder/PlaceFinder";
import { useGeocodedPlace } from "../../PlaceFinder/useGeocodedPlace";
import DayBlock from "./components/DayBlock/DayBlock";
import ExternalLinks from "./components/ExternalLinks/ExternalLinks";
import WeatherBlock from "./components/Weather/WeatherBlock";

/**
 * Local conditions – daylight for the stored geocoded place, derived on
 * device with suncalc (ADR 0005). No network call happens for solar times;
 * the place is the one shared geocoded place (default Östersund, Sweden)
 * and the header button opens the same Change location modal as Home.
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
      <DayBlock heading="Today's daylight chart" day={today} />
      <WeatherBlock place={place} />
      <ExternalLinks place={place} />
    </div>
  );
};

export default LocalConditions;
