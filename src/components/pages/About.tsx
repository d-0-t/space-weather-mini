import "./Pages.css";

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
          You can find my GitHub page{" "}
          <a href="https://github.com/d-0-t" rel="noreferrer" target="_blank">
            here
          </a>
          , where you can find my other projects.
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
          my busy life,
          <br />
          but I hope I can make it work. :-)
        </p>
        <p>
          Before that, I wanted to render an actual site for the data and its
          visualization. Here it is!
        </p>
      </article>

      <article>
        <h2>Data &amp; Sources</h2>
        <p>
          I used NASA's Space Weather data, parsed from their public
          directories. They are freely available for you here:
        </p>
        <h3 className="aboutDataLinksTitle">Resources used:</h3>
        <ul className="aboutDataLinks">
          <li>
            <a
              href="https://services.swpc.noaa.gov/text/"
              rel="noreferrer"
              target="_blank"
            >
              SWPC NOAA text library (full)
            </a>
          </li>
          <li>
            <a
              href="https://services.swpc.noaa.gov/text/27-day-outlook.txt"
              rel="noreferrer"
              target="_blank"
            >
              SWPC NOAA 27 Day Outlook
            </a>
          </li>
          <li>
            <a
              href="https://services.swpc.noaa.gov/text/3-day-forecast.txt"
              rel="noreferrer"
              target="_blank"
            >
              SWPC NOAA 3 Day Forecast
            </a>
          </li>
          <li>
            <a
              href="https://services.swpc.noaa.gov/text/weekly.txt"
              rel="noreferrer"
              target="_blank"
            >
              SWPC NOAA Weekly
            </a>
          </li>
          <li>
            <a
              href="https://services.swpc.noaa.gov/text/daily-geomagnetic-indices.txt"
              rel="noreferrer"
              target="_blank"
            >
              SWPC NOAA Daily Geomagnetic Indices
            </a>
          </li>
          <li>
            <a
              href="https://services.swpc.noaa.gov/text/discussion.txt"
              rel="noreferrer"
              target="_blank"
            >
              SWPC NOAA Discussion
            </a>
          </li>
          <li>
            <a
              href="https://services.swpc.noaa.gov/text/wwv.txt"
              rel="noreferrer"
              target="_blank"
            >
              SWPC NOAA Geophysical Alert Message
            </a>
          </li>
        </ul>
        <h3 className="aboutDataLinksTitle">Useful / related links:</h3>
        <ul className="aboutDataLinks">
          <li>
            <a
              href="https://www.swpc.noaa.gov/products/planetary-k-index"
              rel="noreferrer"
              target="_blank"
            >
              SWPC NOAA Planetary K-index Graph (3 days)
            </a>
          </li>
          <li>
            <a
              href="https://www.swpc.noaa.gov/products/aurora-30-minute-forecast"
              rel="noreferrer"
              target="_blank"
            >
              SWPC NOAA Aurora - 30 minute forecast
            </a>
          </li>
          <li>
            <a
              href="https://www.swpc.noaa.gov/content/space-weather-glossary"
              rel="noreferrer"
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
