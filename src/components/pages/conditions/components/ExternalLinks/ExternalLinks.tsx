import "./ExternalLinks.scss";
import CollapsiblePanel from "../../../../CollapsiblePanel/CollapsiblePanel";
import type { GeocodedPlace } from "../../../../../data/place-storage";
import {
  cloudCoverMapUrl,
  lightPollutionMapUrl,
} from "../../../../../data/external-links";
import OpenInNew from "@mui/icons-material/OpenInNew";

interface ExternalLinksProps {
  place: GeocodedPlace;
}

/**
 * External map links for the current geocoded place (ticket 04): the
 * light-pollution viewer and the live cloud-cover map, each baked with the
 * place's lat and lon and opening in a new tab. No Bortle number or map
 * widget is shown – only honest links.
 */
const ExternalLinks: React.FC<ExternalLinksProps> = ({ place }) => {
  const pollutionHref = lightPollutionMapUrl(place.latitude, place.longitude);
  const cloudHref = cloudCoverMapUrl(place.latitude, place.longitude);
  return (
    <section className="conditions__external">
      <CollapsiblePanel
        heading={<h2>External maps</h2>}
        bodyId="conditions-external-body"
      >
        <ul>
          <li>
            <a href={pollutionHref} target="_blank" rel="noopener noreferrer">
              See light pollution at this spot on lightpollutionmap.info{" "}
              <OpenInNew aria-hidden="true" fontSize="inherit" />
            </a>
          </li>
          <li>
            <a href={cloudHref} target="_blank" rel="noopener noreferrer">
              See live cloud cover on weather-radar-live.com{" "}
              <OpenInNew aria-hidden="true" fontSize="inherit" />
            </a>
          </li>
        </ul>
      </CollapsiblePanel>
    </section>
  );
};

export default ExternalLinks;
