import { useMemo, useState } from "react";

import HelpPopover from "../../../../HelpPopover/HelpPopover";
import PlaceFinder from "../../../../PlaceFinder/PlaceFinder";
import { useGeocodedPlace } from "../../../../PlaceFinder/useGeocodedPlace";
import { shortPlace } from "../../../../../data/short-display-name";
import {
  VIEW_DISTANCE_BANDS,
  distanceToNearestAurora,
  loadViewDistanceThreshold,
} from "../../../../../products/view-distance";
import { useOvationQuery } from "./useOvationQuery";
import CurrentWeatherLine from "./CurrentWeatherLine";

import "./ViewDistanceLine.scss";

/** The NOAA product page the Oval forecast comes from (spec provenance). */
const AURORA_FORECAST_URL =
  "https://www.swpc.noaa.gov/products/aurora-30-minute-forecast";

/**
 * The approved plain-language explainer (ticket 05): what one colored
 * square is, that the band is not a single km, and what can still hide the
 * aurora – repeated from the oval explainer in chaser words.
 */
const VIEW_DISTANCE_COPY =
  "Each colored square is a 30-min forecast (1°). 0 = no color = no forecast " +
  "there. 1 faint → 16+ bright. Nearest square ≥6 is the band, not a single " +
  "km. Cloud/moon/town lights can still hide it. Forecast Time 30-90 min ahead.";

/**
 * The View distance band line under the oval: `Aurora {band} (i) – {place}
 * [icon]`. The confidence reads lowercase mid-sentence (no preposition –
 * `from`/`at` do not work for every band), the place is plain text, and one
 * icon-only `btn--secondary` trigger (title + sr-only `Change location`)
 * opens the shared PlaceFinder modal. The `(i)` sits right after the info
 * it explains and carries the approved copy, the band table and the
 * provenance link. Below it sits the current-weather one-liner with the
 * Local conditions link (CurrentWeatherLine), sharing this place. Hidden
 * while the grid has not loaded – the oval map above carries the loading
 * and error states.
 */
const ViewDistanceLine: React.FC = () => {
  const { place, pick } = useGeocodedPlace();
  const ovalQuery = useOvationQuery();
  const product = ovalQuery.data ?? null;
  // The chaser-set threshold is read once per mount from the versioned
  // storage; nothing else writes it while the line is mounted.
  const [threshold] = useState(() => loadViewDistanceThreshold(localStorage));
  const { shortName } = shortPlace(place);

  const viewDistance = useMemo(() => {
    if (!product) return null;
    return distanceToNearestAurora(place, product.coordinates, threshold);
  }, [place, product, threshold]);

  if (!product || !viewDistance) return null;

  return (
    <section className="view-distance">
      {/* A div, not a <p>: the (i) popover's <details> is not phrasing
          content, so a browser would auto-close a <p> around it and break
          the line apart. */}
      <div className="view-distance__probability">
        <div className="view-distance__probability__location">
          <PlaceFinder
            place={place}
            onPick={pick}
            actionLabel="Change location"
          />
          <div className="view-distance__probability__location__text">
            <span>Aurora {viewDistance.confidence.toLowerCase()}</span>
            <br />
            <span>{shortName}</span>
          </div>
        </div>
        <HelpPopover
          popoverClassName="view-distance__popover"
          content={{
            label: "About view distance",
            rows: VIEW_DISTANCE_BANDS.map(({ label, range, confidence }) => [
              range ? `${label} ~${range}` : label,
              confidence,
            ]),
          }}
        />
      </div>
      {/* The current-weather one-liner plus the Local conditions link,
          sharing this section's place so the modal pick refetches it. */}
      <CurrentWeatherLine place={place} />
      {/* Honest freshness: As of the Forecast Time the band covers, with the
          age of the grid issue (Observation Time) per ticket 05. 
          COMMENTED OUT: The freshness is duplicated, oval freshness already has the same info. <FreshnessLine
        asOf={product.forecastTime}
        updated={formatAge(product.observationTime)}
      /> */}
    </section>
  );
};

export default ViewDistanceLine;
