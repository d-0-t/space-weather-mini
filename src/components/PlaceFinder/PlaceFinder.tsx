import "./PlaceFinder.scss";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import CloseIcon from "@mui/icons-material/Close";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import OpenInNew from "@mui/icons-material/OpenInNew";
import {
  createGeocodingClient,
  getDeviceLocation,
  type GeocodeMatch,
} from "../../data/geocoding";
import type { GeocodedPlace } from "../../data/place-storage";
import { shortPlace } from "../../data/short-display-name";
import { flagSrc } from "../pages/webcams/webcam-card-parts";

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

/** Shown when the fix is too coarse to trust as a town. */
const LOW_ACCURACY_COPY = "Low accuracy – double-check the place name";

/** Above this many meters the fix may miss the right block, let alone town. */
const LOW_ACCURACY_THRESHOLD_M = 200;

interface PlaceFinderProps {
  /** The stored geocoded place; names and labels the trigger button. */
  place: GeocodedPlace;
  /** Called with the confirmed pick – a search match or a confirmed device fix. */
  onPick: (match: GeocodeMatch) => void;
}

/**
 * The shared place picker: an `icon+shortName+flag` trigger button (label
 * collapses to sr-only on narrow viewports) that opens one `Change location`
 * modal. Inside: a freeform Nominatim search that runs only on Enter or the
 * Search tap (never per keystroke), a radio pick list of up to five matches,
 * the required ODbL attribution, and a single-shot browser geolocation
 * button whose fix is proposed with its ±accuracy. Selecting a match or a
 * device fix only stages it – nothing becomes the stored place until the
 * `Apply and close` tap, and `Cancel` (or X / backdrop / Escape) discards
 * the staged pick and resets the field, keeping the current place.
 */
const PlaceFinder: React.FC<PlaceFinderProps> = ({ place, onPick }) => {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<GeocodeMatch[] | null>(null);
  const [error, setError] = useState<keyof typeof SEARCH_ERROR_COPY | null>(
    null,
  );
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);
  /** The device fix awaiting confirmation – never stored before the Apply tap. */
  const [proposed, setProposed] = useState<{
    match: GeocodeMatch;
    accuracy: number;
  } | null>(null);
  /** The staged pick – a search match or device fix – applied on Apply. */
  const [pending, setPending] = useState<GeocodeMatch | null>(null);
  const client = useMemo(() => createGeocodingClient(), []);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchFieldRef = useRef<HTMLInputElement>(null);
  const radioRefs = useRef<Array<HTMLInputElement | null>>([]);
  const titleId = useId();
  const { shortName, country, countryCode } = shortPlace(place);

  /** Opens the modal and moves keyboard focus inside it (the search field). */
  const open = (): void => {
    dialogRef.current?.showModal();
    searchFieldRef.current?.focus();
  };

  /** A closed modal starts clean: no stale query, matches, staged pick or fix. */
  const reset = (): void => {
    setQuery("");
    setMatches(null);
    setError(null);
    setLocationError(false);
    setProposed(null);
    setPending(null);
  };

  const close = (): void => {
    dialogRef.current?.close();
  };

  /**
   * Discards the staged pick and the typed query, keeping the current place.
   * Resets explicitly (not only via `onClose`) so Cancel and X always leave
   * a clean modal even where the dialog `close` event never fires.
   */
  const dismiss = (): void => {
    reset();
    close();
  };

  // A click on the backdrop (outside the dialog box) closes the modal, as in
  // FullSizeModal. Pointerdown (primary button only) so keyboard activation
  // of controls never dismisses it.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!dialog.open) return;
      if (event.button !== 0) return;
      const rect = dialog.getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        dialog.close();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearching(true);
    setError(null);
    setMatches(null);
    setPending(null);
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

  /** Selecting only stages the match – Apply commits it, Cancel drops it. */
  const handlePick = (match: GeocodeMatch): void => {
    setPending(match);
  };

  /** The staged pick becomes the stored place and the modal closes behind it. */
  const applyAndClose = (): void => {
    if (!pending) return;
    onPick(pending);
    close();
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
    setProposed(null);
    const fix = await getDeviceLocation();
    if (fix.status !== "ok") {
      setLocating(false);
      setLocationError(true);
      return;
    }
    const reverse = await client.reverse(fix.latitude, fix.longitude);
    setLocating(false);
    // Reverse geocoding names the spot so the visitor can verify the fix;
    // the stored place keeps the fix's own coordinates, and "My location"
    // is the honest fallback when Nominatim cannot name it.
    setProposed({
      match: reverse
        ? { ...reverse, latitude: fix.latitude, longitude: fix.longitude }
        : {
            displayName: "My location",
            shortName: "My location",
            latitude: fix.latitude,
            longitude: fix.longitude,
          },
      accuracy: fix.accuracy,
    });
  };

  /** Staging the device fix – it is stored only on the Apply tap. */
  const confirmFix = (): void => {
    if (!proposed) return;
    setPending(proposed.match);
  };

  return (
    <>
      <button
        type="button"
        className="btn--secondary place-finder__trigger"
        title={place.displayName}
        onClick={open}
      >
        <LocationOnIcon aria-hidden="true" fontSize="small" />
        <span className="btn__label">{shortName}</span>
        {countryCode ? (
          <img
            className="place-finder__trigger__flag"
            src={flagSrc(countryCode, "16x12")}
            srcSet={`${flagSrc(countryCode, "32x24")} 2x, ${flagSrc(countryCode, "48x36")} 3x`}
            width={16}
            height={12}
            alt=""
            title={country}
            loading="lazy"
          />
        ) : null}
      </button>
      <dialog
        ref={dialogRef}
        className="place-finder__modal"
        aria-labelledby={titleId}
        onClose={reset}
      >
        <button
          type="button"
          className="btn--secondary place-finder__close"
          title="Close"
          onClick={dismiss}
        >
          <CloseIcon fontSize="medium" />
          <span className="sr-only">Close</span>
        </button>
        <h2 id={titleId}>Change location</h2>
        <form className="place-finder__search" onSubmit={handleSubmit}>
          <label
            className="place-finder__search__label"
            htmlFor="place-finder-search-field"
          >
            Search for a place
          </label>
          <div className="place-finder__search__row">
            <input
              ref={searchFieldRef}
              id="place-finder-search-field"
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
                        name="place-finder-match"
                        checked={pending?.displayName === match.displayName}
                        onChange={() => handlePick(match)}
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
        {proposed !== null ? (
          <div className="place-finder__fix">
            <p
              className="place-finder__fix__name"
              title={proposed.match.displayName}
            >
              {proposed.match.displayName}
            </p>
            <p className="place-finder__fix__accuracy">
              ±{Math.round(proposed.accuracy)}m
            </p>
            {proposed.accuracy > LOW_ACCURACY_THRESHOLD_M ? (
              <p
                className="place-finder__fix__warning place-finder__status"
                role="status"
              >
                {LOW_ACCURACY_COPY}
              </p>
            ) : null}
            <button type="button" className="btn--primary" onClick={confirmFix}>
              Use this location
            </button>
          </div>
        ) : null}
        <p className="place-finder__attribution">
          <a href={OSM_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">
            © OpenStreetMap contributors{" "}
            <OpenInNew aria-hidden="true" fontSize="inherit" />
          </a>
        </p>
        {pending !== null ? (
          <p className="place-finder__pending" role="status">
            Selected: {pending.displayName}
          </p>
        ) : null}
        <div className="place-finder__actions">
          <button type="button" className="btn--secondary" onClick={dismiss}>
            Cancel
          </button>
          <button
            type="button"
            className="btn--primary"
            disabled={pending === null}
            onClick={applyAndClose}
          >
            Apply and close
          </button>
        </div>
      </dialog>
    </>
  );
};

export default PlaceFinder;
