import "./ExternalLinks.scss";
import type { GeocodedPlace } from "../../../../../data/place-storage";
import {
  cloudCoverMapUrl,
  lightPollutionMapUrl,
} from "../../../../../data/external-links";

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
      <h2>External maps</h2>
      <p>
        No numeric light pollution value is shown – these yearly VIIRS and live
        satellite viewers let you check the sky yourself.
      </p>
      <ul>
        <li>
          <a
            href={pollutionHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            See light pollution at this spot on lightpollutionmap.info
          </a>
        </li>
        <li>
          <a
            href={cloudHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            See live cloud cover on weather-radar-live.com
          </a>
        </li>
      </ul>
    </section>
  );
};

export default ExternalLinks;
