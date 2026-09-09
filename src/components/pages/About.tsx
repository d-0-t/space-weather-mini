import OpenInNew from "@mui/icons-material/OpenInNew";
import "./Pages.scss";
import "./About.scss";
import { Link } from "react-router-dom";

/**
 * The "This site" page of the About submenu (ticket 01): the site-focused
 * article, purpose and features first, plus the future-plans section. The
 * biography is gone and the Data & Sources article moved to the Sources
 * subpage at /about/sources.
 */
const About: React.FC = () => {
  return (
    <div className="container about">
      <h1>This site</h1>

      <article>
        <h2>Who am I?</h2>
        <p>
          My name is <strong>Dot</strong>. I'm a software developer and creative
          artist with more hobbies than I can count. Besides coding; writing,
          painting, and other handcrafts are my greatest passion.
        </p>
        <p>
          After a life-long dream of wanting to watch auroras, I moved to
          Northern Sweden in 2023. I enjoy photographing them in every dark
          season. This interest and my background allowed me to create my own
          aurora platform; one that tells me the most relevant information in a
          clean, accessible way.
        </p>
        <p>
          <a
            href="https://github.com/d-0-t"
            rel="noopener noreferrer"
            target="_blank"
          >
            See my other projects on GitHub{" "}
            <OpenInNew aria-hidden="true" fontSize="inherit" />
          </a>
        </p>

        <h2>What this site does</h2>
        <p>
          This site is a display for space weather data, built for aurora
          chasers. I kept digging through various apps' data to figure out
          whether tonight was a go; so I put the numbers, maps and forecasts on
          one screen for a quicker decision.
        </p>
        <p>
          The <Link to="/">Dashboard</Link> shows current conditions: solar wind
          speed and density, the interplanetary magnetic field (Bt and Bz), the
          live Kp index, magnetometer readings from the Swedish Institute of
          Space Physics and NOAA, hemispheric power, Dst, and the OVATION aurora
          forecast with a view-distance estimate from your saved place.{" "}
          <strong>
            Each chart includes an informational icon that helps you interpret
            the data.
          </strong>
        </p>
        <p>
          The <strong>Details menu</strong> carries NOAA's written products in
          full: the forecast discussion, 3-day forecast, weekly report, 27-day
          outlook, daily geomagnetic indices and geophysical alert text.
          {/* where you can set a Kp threshold and opt in to browser notifications. */}
        </p>
        <p>
          <Link to="/conditions">Local conditions </Link>
          tells you whether tonight is dark and clear at a place you pick, with
          twilight times and weather forecast.
        </p>
        <p>
          The <Link to="/webcams">Webcams</Link> page embeds sky cameras from
          various operators and you can filter and pin your favorite ones.
        </p>
        <p>
          The <Link to="/explainers">Explainers</Link> page is a plain-language
          glossary for everything on screen.
        </p>

        <h2>Install on mobile</h2>
        <p>
          This site can be installed from a mobile browser as an app. This
          allows easy access and a temporary storage of the last downloaded
          data, even offline.
        </p>
        <ol>
          <li>
            Go to this website using your{" "}
            <strong>smart phone's browser.</strong>
          </li>
          <li>
            Tap the <strong>three vertical dots</strong> in the top-right
            corner.
          </li>
          <li>
            Tap <strong>Install</strong> and <strong>Create shortcut</strong> or{" "}
            <strong>Add to Home screen</strong>, then <strong>confirm</strong>.
          </li>
          <li>Run the app.</li>
        </ol>
      </article>
    </div>
  );
};

export default About;
