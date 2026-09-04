import { useCallback, useEffect, useState } from "react";
import {
  PLACE_STORAGE_KEY,
  loadGeocodedPlace,
  saveGeocodedPlace,
  type GeocodedPlace,
} from "../../data/place-storage";
import type { GeocodeMatch } from "../../data/geocoding";

/**
 * The single stored geocoded place shared by Home and Local conditions:
 * loads the last picked place (defaulting to Östersund), persists the
 * default on first open, and writes every confirmed pick through to
 * localStorage under the one versioned key, so a town picked on either
 * page is the town on the other.
 */
export function useGeocodedPlace(): {
  place: GeocodedPlace;
  pick: (match: GeocodeMatch) => void;
} {
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
  const pick = useCallback((match: GeocodeMatch): void => {
    const picked: GeocodedPlace = {
      ...match,
      fetchedAt: new Date().toISOString(),
    };
    saveGeocodedPlace(localStorage, picked);
    setPlace(picked);
  }, []);
  return { place, pick };
}
