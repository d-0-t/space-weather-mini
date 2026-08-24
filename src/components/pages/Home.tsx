import "./Pages.scss";
import ThreeDayForecast from "./forecasts/3-day-forecast";
import VisualAuroras from "../visualtabs/Auroras";
import GeophysicalAlert from "./forecasts/geophysical-alert";

const Home: React.FC = () => {
  return (
    <div className="home-wrapper">
      <h1>Home</h1>
      <div className="pageIntroduction">
        <p>Welcome to the mini space weather forecast page!</p>
        <p>
          On the Home page you can find a few interesting highlights and
          predictions. You can browse the "Forecasts &amp; Discussion" menu for
          more details.
        </p>
      </div>
      <div className="homeFlow">
        <div className="homeFlow2 homeMini">
          <VisualAuroras />
          <GeophysicalAlert />
        </div>
        <ThreeDayForecast />
      </div>
    </div>
  );
};

export default Home;
