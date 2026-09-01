import "./conditions.scss";
import { useEffect, useState } from "react";
import {
  PLACE_STORAGE_KEY,
  loadGeocodedPlace,
  saveGeocodedPlace,
  type GeocodedPlace,
} from "../../../data/place-storage";
import { daylightTimes } from "../../../data/sun";
import type { GeocodeMatch } from "../../../data/geocoding";
import DayBlock from "./components/DayBlock/DayBlock";
import ExternalLinks from "./components/ExternalLinks/ExternalLinks";
import PlaceFinder from "./components/PlaceFinder/PlaceFinder";
import WeatherBlock from "./components/Weather/WeatherBlock";
import { flagSrc } from "../webcams/webcam-card-parts";
import { shortPlace } from "./utils/short-display-name";

/**
 * Local conditions – daylight for the stored geocoded place, derived on
 * device with suncalc (ADR 0005). No network call happens for solar times;
 * the place defaults to Kiruna, Sweden and persists the first pick.
 */
const LocalConditions: React.FC = () => {
  const [place, setPlace] = useState<GeocodedPlace>(() =>
    loadGeocodedPlace(localStorage),
  );
  useEffect(() => {
    if (localStorage.getItem(PLACE_STORAGE_KEY) === null) {
      saveGeocodedPlace(localStorage, {
        ...place,
        fetchedAt: new Date().toISOString(),
      });
    }
  }, [place]);
  const { today } = daylightTimes(
    // tomorrow
    place.latitude,
    place.longitude,
    new Date(),
  );
  const handlePick = (match: GeocodeMatch): void => {
    const picked: GeocodedPlace = {
      ...match,
      fetchedAt: new Date().toISOString(),
    };
    saveGeocodedPlace(localStorage, picked);
    setPlace(picked);
  };
  const { shortName, country, countryCode } = shortPlace(place);
  return (
    <div className="container conditions">
      <div className="conditions__header">
        <h1>Local conditions</h1>
        <p className="conditions__place" title={place.displayName}>
          {countryCode ? (
            <img
              className="conditions__place-flag"
              src={flagSrc(countryCode, "16x12")}
              srcSet={`${flagSrc(countryCode, "32x24")} 2x, ${flagSrc(countryCode, "48x36")} 3x`}
              width={16}
              height={12}
              alt={country}
              title={country}
              loading="lazy"
            />
          ) : null}{" "}
          {shortName}
        </p>
      </div>
      <PlaceFinder onPick={handlePick} />
      <DayBlock heading="Today's daylight chart" day={today} />
      {/* <DayBlock heading="Tomorrow's daylight chart" day={tomorrow} /> */}
      <WeatherBlock place={place} />
      <ExternalLinks place={place} />
    </div>
  );
};

export default LocalConditions;
