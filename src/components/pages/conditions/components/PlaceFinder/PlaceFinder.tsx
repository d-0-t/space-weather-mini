import "./PlaceFinder.scss";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import CollapsiblePanel from "../../../../CollapsiblePanel/CollapsiblePanel";
import {
  createGeocodingClient,
  getDeviceLocation,
  type GeocodeMatch,
} from "../../../../../data/geocoding";
import { OpenInNew } from "@mui/icons-material";
import { shortDisplayName } from "../../utils/short-display-name";

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
  const radioRefs = useRef<Array<HTMLInputElement | null>>([]);

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

  const handleMatchesKeyDown = (
    event: KeyboardEvent<HTMLFieldSetElement>,
  ): void => {
    if (matches === null || matches.length === 0) return;
    const active = document.activeElement as HTMLElement | null;
    const currentIndex = radioRefs.current.findIndex((el) => el === active);
    // Only handle keys when focus is inside the radio group
    if (currentIndex === -1) return;
    let next: number | null = null;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        event.preventDefault();
        next = (currentIndex + 1) % matches.length;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        event.preventDefault();
        next = (currentIndex - 1 + matches.length) % matches.length;
        break;
      case "Home":
        event.preventDefault();
        next = 0;
        break;
      case "End":
        event.preventDefault();
        next = matches.length - 1;
        break;
      case "Enter":
        event.preventDefault();
        handlePick(matches[currentIndex]);
        return;
      default:
        return;
    }
    if (next !== null) {
      radioRefs.current[next]?.focus();
    }
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
      shortName: match?.displayName
        ? shortDisplayName(match?.displayName)
        : "My location",
      latitude: fix.latitude,
      longitude: fix.longitude,
    });
  };

  return (
    <section className="conditions__finder">
      <CollapsiblePanel
        heading={<h2>Location</h2>}
        bodyId="conditions-finder-body"
      >
        <form className="place-finder__search" onSubmit={handleSubmit}>
          <label
            className="place-finder__search__label"
            htmlFor="conditions-search-field"
          >
            Search for a place
          </label>
          <div className="place-finder__search__row">
            <input
              id="conditions-search-field"
              type="search"
              className="place-finder__search__row__field"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. Tromsø, Norway"
            />
            <button type="submit" className="btn--primary" disabled={searching}>
              {searching ? "Searching…" : "Search"}
            </button>
            <button
              type="button"
              className="btn--secondary"
              disabled={locating}
              onClick={handleFindMyLocation}
            >
              {locating ? "Locating…" : "Find my location"}
            </button>
          </div>
          {error !== null ? (
            <p className="place-finder__status" role="status">
              {SEARCH_ERROR_COPY[error]}
            </p>
          ) : null}
          {matches !== null ? (
            <fieldset
              className="place-finder__matches"
              onKeyDown={handleMatchesKeyDown}
            >
              <legend className="sr-only">Places matching “{query}”</legend>
              <ul>
                {matches.map((match, index) => (
                  <li key={match.displayName}>
                    <label>
                      <input
                        ref={(element) => {
                          radioRefs.current[index] = element;
                        }}
                        type="radio"
                        name="conditions-place-match"
                        onClick={() => handlePick(match)}
                      />
                      {match.displayName}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          ) : null}
        </form>
        {locationError ? (
          <p className="place-finder__status" role="status">
            {LOCATION_ERROR_COPY}
          </p>
        ) : null}
        <p className="place-finder__attribution">
          <a href={OSM_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">
            © OpenStreetMap contributors{" "}
            <OpenInNew aria-hidden="true" fontSize="inherit" />
          </a>
        </p>
      </CollapsiblePanel>
    </section>
  );
};

export default PlaceFinder;
