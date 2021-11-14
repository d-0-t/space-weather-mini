import './App.css';
import Home from './pages/Home';
import Forecasts from './pages/Forecasts';
import About from './pages/About';
import { Routes, Route } from 'react-router-dom';
import ForecastDiscussion from './pages/forecasts/Discussion';
import GeoAlert from './pages/forecasts/GeoAlert';
import WeeklyReport from './pages/forecasts/Weekly';
import TwentySevenDays from './pages/forecasts/27days';
import ThreeDaysReport from './pages/forecasts/3days';
import DailyReport from './pages/forecasts/Daily';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />}>
      </Route>
      <Route path="/forecasts" element={<Forecasts />}>
      </Route>
      <Route path="/forecasts/discussion" element={<ForecastDiscussion />}>
      </Route>
      <Route path="/forecasts/daily" element={<DailyReport />}>
      </Route>
      <Route path="/forecasts/weekly" element={<WeeklyReport />}>
      </Route>
      <Route path="/forecasts/3days" element={<ThreeDaysReport />}>
      </Route>
      <Route path="/forecasts/27days" element={<TwentySevenDays />}>
      </Route>
      <Route path="/forecasts/geoalert" element={<GeoAlert />}>
      </Route>
      <Route path="/about" element={<About />}>
      </Route>
    </Routes>
  );
}

export default App;
