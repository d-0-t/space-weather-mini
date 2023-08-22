import "./Pages.css";
import GeoAlert from "./forecasts/GeoAlert";
import ThreeDaysReport from "./forecasts/3days";
import VisualAuroras from "../visualtabs/Auroras";
/*
import TwentySevenDays from './forecasts/27days';
<div className="homeMini" id="the27DaysPage"><TwentySevenDays /></div>
*/

const Home: React.FC = () => {
  return (
    <div id="container_home">
      <h1>Home</h1>
      <div className="pageIntroduction">
        <p>Welcome to the mini space weather forecast page!</p>
        <p>
          On the Home page you can find a few interesting highlights and
          predictions. You can browse the "Forecasts &amp; Discussion" menu for
          more details.
        </p>
      </div>
      <div id="homeFlow">
        <div id="homeFlow2" className="homeMini">
          <div id="visual-aurora">
            <VisualAuroras />
          </div>
          <div id="geoAlertPage">
            <GeoAlert />
          </div>
        </div>
        <div className="homeMini" id="the3DaysPage">
          <ThreeDaysReport />
        </div>
      </div>
    </div>
  );
};

export default Home;
