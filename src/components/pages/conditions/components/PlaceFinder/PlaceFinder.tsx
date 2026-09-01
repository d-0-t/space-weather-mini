import "./PlaceFinder.scss";
import { useMemo, useState } from "react";
import {
  createGeocodingClient,
  getDeviceLocation,
  type GeocodeMatch,
} from "../../../../../data/geocoding";

const OSM_COPYRIGHT_URL = "https://www.openstreetmap.org/copyright";

/** The honest search error copies – empty, busy, and plain failure. */
const SEARCH_ERROR_COPY: Record<"no-match" | "busy" | "failed", string> = {
  "no-match": "No match – try adding a country",
  busy: "Search is busy – wait a second",
  failed: "Search failed – try again",
};

/** The single honest copy for any device location failure (ticket 02). */
const LOCATION_ERROR_COPY =
  "Could not get your device location – type a place like 'Tromsø, Norway'";

/**
 * The find-a-place block: a freeform Nominatim search that runs only on
 * Enter or the Search tap (never per keystroke), a radio pick list of up to
 * five matches, the required ODbL attribution, and a single-shot browser
 * geolocation button that reverse geocodes the fix through Nominatim.
 */
const PlaceFinder: React.FC<{
  onPick: (match: GeocodeMatch) => void;
}> = ({ onPick }) => {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<GeocodeMatch[] | null>(null);
  const [error, setError] = useState<keyof typeof SEARCH_ERROR_COPY | null>(
    null,
  );
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const client = useMemo(() => createGeocodingClient(), []);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearching(true);
    setError(null);
    setMatches(null);
    const result = await client.search(trimmed);
    setSearching(false);
    switch (result.status) {
      case "ok":
        setMatches(result.matches);
        break;
      case "no-match":
      case "busy":
      case "failed":
        setError(result.status);
        break;
    }
  };

  const handlePick = (match: GeocodeMatch): void => {
    onPick(match);
    setMatches(null);
    setError(null);
  };

  const handleFindMyLocation = async (): Promise<void> => {
    setLocating(true);
    setLocationError(false);
    const fix = await getDeviceLocation();
    if (fix.status !== "ok") {
      setLocating(false);
      setLocationError(true);
      return;
    }
    const match = await client.reverse(fix.latitude, fix.longitude);
    setLocating(false);
    // Reverse geocoding names the spot so the visitor can verify the fix;
    // "My location" is the honest fallback when Nominatim cannot name it.
    onPick({
      displayName: match?.displayName ?? "My location",
      latitude: fix.latitude,
      longitude: fix.longitude,
    });
  };

  return (
    <section className="conditions__finder">
      <h2>Find a place</h2>
      <form className="conditions__search" onSubmit={handleSubmit}>
        <label className="conditions__label" htmlFor="conditions-search-field">
          Search for a place
        </label>
        <div className="conditions__search-row">
          <input
            id="conditions-search-field"
            type="search"
            className="conditions__field"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. Tromsø, Norway"
          />
          <button type="submit" className="btn--primary" disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </button>
        </div>
        {error !== null ? (
          <p className="conditions__status" role="status">
            {SEARCH_ERROR_COPY[error]}
          </p>
        ) : null}
        {matches !== null ? (
          <fieldset className="conditions__matches">
            <legend className="sr-only">Places matching “{query}”</legend>
            <ul className="conditions__match-list">
              {matches.map((match) => (
                <li key={match.displayName}>
                  <label className="conditions__match">
                    <input
                      className="conditions__match-input"
                      type="radio"
                      name="conditions-place-match"
                      onChange={() => handlePick(match)}
                    />
                    {match.displayName}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ) : null}
        <p className="conditions__attribution">
          <a href={OSM_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">
            © OpenStreetMap contributors
          </a>
        </p>
      </form>
      <div className="conditions__locate">
        <button
          type="button"
          className="btn--secondary"
          disabled={locating}
          onClick={handleFindMyLocation}
        >
          {locating ? "Locating…" : "Find my location"}
        </button>
        {locationError ? (
          <p className="conditions__status" role="status">
            {LOCATION_ERROR_COPY}
          </p>
        ) : null}
      </div>
    </section>
  );
};

export default PlaceFinder;
