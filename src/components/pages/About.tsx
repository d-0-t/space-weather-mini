import "./Pages.scss";

const About: React.FC = () => {
  return (
    <div className="container">
      <h1>About</h1>

      <article>
        <h2>Me &amp; the Site</h2>
        <h3>A very short biography</h3>
        <p>
          My name is <b>Dot</b> and I'm a full-stack developer with more hobbies
          and interests than I could count.
        </p>
        <p>
          You can find my other projects on my{" "}
          <a
            href="https://github.com/d-0-t"
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub page
          </a>
          .
        </p>

        <h3>The future plans for the site (alert service)</h3>
        <p>
          Initially, I started this project to construct some kind of
          subscription service that will send you an alert if there is a
          predicted/forecasted/currently ongoing solar storm / northern lights.
          The service would let you set the intensity of the solar storm you
          wish to be alerted about.{" "}
          <b>I want to turn this into a free feature.</b>
        </p>
        <p>
          Developing and executing said plans will probably take a while due to
          my busy life, but I hope I can make it work. :-)
        </p>
        <p>
          Before that, I wanted to render an actual site for the data and its
          visualization. Here it is!
        </p>
      </article>

      <article>
        <h2>Data &amp; Sources</h2>
        <p>
          I used NOAA SWPC&apos;s space weather data, parsed from their public
          endpoints, plus live feeds from the Swedish Institute of Space
          Physics and the World Data Center for Geomagnetism in Kyoto. All data
          is freely available from its source:
        </p>
        <h3 className="aboutDataLinksTitle">Sources:</h3>
        <ul className="aboutDataLinks">
          <li>
            <a
              href="https://www.swpc.noaa.gov/"
              rel="noopener noreferrer"
              target="_blank"
            >
              NOAA/SWPC
            </a>
          </li>
          <li>
            <a
              href="https://spaceweather.irf.se/"
              rel="noopener noreferrer"
              target="_blank"
            >
              Swedish space weather center (IRF)
            </a>
          </li>
          <li>
            <a
              href="https://wdc.kugi.kyoto-u.ac.jp/"
              rel="noopener noreferrer"
              target="_blank"
            >
              WDC for Geomagnetism, Kyoto
            </a>
          </li>
        </ul>

        <h3 className="aboutDataLinksTitle">Useful / related links:</h3>
        <ul className="aboutDataLinks">
          <li>
            <a
              href="https://www.swpc.noaa.gov/products/planetary-k-index"
              rel="noopener noreferrer"
              target="_blank"
            >
              SWPC NOAA Planetary K-index Graph (3 days)
            </a>
          </li>
          <li>
            <a
              href="https://www.swpc.noaa.gov/products/aurora-30-minute-forecast"
              rel="noopener noreferrer"
              target="_blank"
            >
              SWPC NOAA Aurora - 30 minute forecast
            </a>
          </li>
          <li>
            <a
              href="https://www.swpc.noaa.gov/content/space-weather-glossary"
              rel="noopener noreferrer"
              target="_blank"
            >
              SWPC NOAA Glossary and Terminology
            </a>
          </li>
        </ul>
      </article>
    </div>
  );
};

export default About;
