import { Link } from "react-router-dom";

import "./Pages.scss";
import ThreeDayForecast from "./forecasts/3-day-forecast";
import VisualAuroras from "../visualtabs/Auroras";

const Home: React.FC = () => {
  return (
    <div className="home-wrapper">
      <h1>Home</h1>
      <div className="pageIntroduction">
        <p>Welcome to the mini space weather forecast page!</p>
        <p>
          On the Home page you can find a few interesting highlights and
          predictions. You can browse the &quot;Forecasts &amp; Discussion&quot; menu for
          more details.
        </p>
      </div>
      <div className="homeFlow">
        <div className="homeFlow2 homeMini">
          <VisualAuroras />
          <div className="container">
            <article>
              <h2>Geophysical Alert</h2>
              <p>
                <Link to="/forecasts/geoalert">Geophysical Alert page</Link>
              </p>
            </article>
          </div>
        </div>
        <div className="homeMini">
          <ThreeDayForecast />
        </div>
      </div>
    </div>
  );
};

export default Home;
