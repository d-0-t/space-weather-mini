import './Pages.css';
import GeoAlert from './forecasts/GeoAlert';
import VisualAuroras from '../visualtabs/Auroras';
/*
import DailyReport from './forecasts/Daily';
import ThreeDaysReport from './forecasts/3days';
import TwentySevenDays from './forecasts/27days';
import ForecastDiscussion from './forecasts/Discussion';
import WeeklyReport from './forecasts/Weekly';
*/

function Forecasts() {
  return (
    <div id="container_forecasts">
      <h1>Forecasts</h1>
      <div className="pageIntroduction">
        <p>Please pick one of the 7 modules from the "Forecasts &amp; Discussion" menu to view it individually.</p>
        <p className="highIntro">Until then, enjoy these highlights:</p>
      </div>
      <div id="forecastFlow">
        <VisualAuroras />
        <br/>
        <div className="forecastMini" id="geoAlertPage"><GeoAlert /></div>
      </div>
    </div>
  );
}

export default Forecasts;
