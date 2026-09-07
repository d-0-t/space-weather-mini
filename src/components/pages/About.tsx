import OpenInNew from "@mui/icons-material/OpenInNew";
import "./Pages.scss";

/**
 * The "This site" page of the About submenu (ticket 01): the biography and
 * the future-plans article stay here; the Data & Sources article moved to
 * the Sources subpage at /about/sources.
 */
const About: React.FC = () => {
  return (
    <div className="container">
      <h1>This site</h1>

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
            GitHub page <OpenInNew aria-hidden="true" fontSize="inherit" />
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
    </div>
  );
};

export default About;
