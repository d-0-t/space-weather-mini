import OpenInNew from "@mui/icons-material/OpenInNew";
import "./Pages.scss";

/**
 * The "Sources" subpage of the About submenu (ticket 01): the Data & Sources
 * article moved here wholesale from the About page, with the external source
 * attributions it carried.
 */
const Sources: React.FC = () => {
  return (
    <div className="container">
      <h1>Sources</h1>

      <article>
        <h2>Data &amp; Sources</h2>
        <p>
          I used NOAA SWPC&apos;s space weather data, parsed from their public
          endpoints, plus live feeds from the Swedish Institute of Space Physics
          and the World Data Center for Geomagnetism in Kyoto. All data is
          freely available from its source:
        </p>
        <h3 className="aboutDataLinksTitle">Sources:</h3>
        <ul className="aboutDataLinks">
          <li>
            <a
              href="https://www.swpc.noaa.gov/"
              rel="noopener noreferrer"
              target="_blank"
            >
              SWPC NOAA <OpenInNew aria-hidden="true" fontSize="inherit" />
            </a>{" "}
            - Space Weather Prediction Center - National Oceanic and Atmospheric
            Administration
          </li>
          <li>
            <a
              href="https://www.swpc.noaa.gov/content/space-weather-glossary"
              rel="noopener noreferrer"
              target="_blank"
            >
              SWPC NOAA Glossary and Terminology{" "}
              <OpenInNew aria-hidden="true" fontSize="inherit" />
            </a>
          </li>
          <li>
            <a
              href="https://spaceweather.irf.se/"
              rel="noopener noreferrer"
              target="_blank"
            >
              IRF - Swedish space weather center{" "}
              <OpenInNew aria-hidden="true" fontSize="inherit" />
            </a>
          </li>
          <li>
            <a
              href="https://wdc.kugi.kyoto-u.ac.jp/"
              rel="noopener noreferrer"
              target="_blank"
            >
              WDC for Geomagnetism, Kyoto{" "}
              <OpenInNew aria-hidden="true" fontSize="inherit" />
            </a>
          </li>
          <li>
            <a
              href="https://www.openstreetmap.org/copyright"
              rel="noopener noreferrer"
              target="_blank"
            >
              © OpenStreetMap contributors{" "}
              <OpenInNew aria-hidden="true" fontSize="inherit" />
            </a>{" "}
            – Geocoding via Nominatim
          </li>
          <li>
            <a
              href="https://open-meteo.com/"
              rel="noopener noreferrer"
              target="_blank"
            >
              Open-Meteo <OpenInNew aria-hidden="true" fontSize="inherit" />
            </a>{" "}
            – Weather data (CC BY 4.0)
          </li>
        </ul>
      </article>
    </div>
  );
};

export default Sources;
