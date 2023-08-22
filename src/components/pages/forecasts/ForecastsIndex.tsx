import VisualAuroras from "../../visualtabs/Auroras";
import GeoAlert from "./GeoAlert";
import "./Pages.css";

const Forecasts: React.FC = () => {
  return (
    <div id="container_forecasts">
      <h1>Forecasts</h1>
      <div className="pageIntroduction">
        <p>
          Please pick one of the 7 modules from the "Forecasts &amp; Discussion"
          menu to view it individually.
        </p>
        <p className="highIntro">Until then, enjoy these highlights:</p>
      </div>
      <div id="forecastFlow">
        <VisualAuroras />
        <br />
        <div className="forecastMini" id="geoAlertPage">
          <GeoAlert />
        </div>
      </div>
    </div>
  );
};

export default Forecasts;
