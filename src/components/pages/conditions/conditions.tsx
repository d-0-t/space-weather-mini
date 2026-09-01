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
import PlaceFinder from "./components/PlaceFinder/PlaceFinder";
import WeatherBlock from "./components/Weather/WeatherBlock";

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
  const { today } = daylightTimes(place.latitude, place.longitude, new Date());
  const handlePick = (match: GeocodeMatch): void => {
    const picked: GeocodedPlace = {
      ...match,
      fetchedAt: new Date().toISOString(),
    };
    saveGeocodedPlace(localStorage, picked);
    setPlace(picked);
  };
  return (
    <div className="container conditions">
      <h1>Local conditions</h1>
      <p className="conditions__intro">Daylight chart in your time zone.</p>
      <p className="conditions__place">{place.displayName}</p>
      <PlaceFinder onPick={handlePick} />
      <DayBlock heading="Today's daylight chart" day={today} />
      <WeatherBlock place={place} />
      {/* Only Today renders for now (2026-09-01) – the Tomorrow block is
          kept in case the day-pair view returns. daylightTimes still
          computes tomorrow: today's Night ends at tomorrow's dawn. */}
      {/* <DayBlock heading="Tomorrow" day={tomorrow} /> */}
    </div>
  );
};

export default LocalConditions;
