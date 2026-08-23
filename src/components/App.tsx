import "./App.scss";
import Home from "./pages/Home";
import Forecasts from "./pages/Forecasts";
import About from "./pages/About";
import { Routes, Route } from "react-router-dom";
import ForecastDiscussion from "./pages/forecasts/Discussion";
import GeoAlert from "./pages/forecasts/GeoAlert";
import WeeklyReport from "./pages/forecasts/Weekly";
import TwentySevenDayOutlook from "./pages/forecasts/27-day-outlook";
import ThreeDaysReport from "./pages/forecasts/3days";
import DailyReport from "./pages/forecasts/Daily";

const App: React.FC = () => {
  return (
    <Routes>
      <Route path={""} element={<Home />} />
      <Route path={"home"} element={<Home />} />
      <Route path={"forecasts"} element={<Forecasts />}>
        <Route index element={<ForecastDiscussion />} />
        <Route path={"discussion"} element={<ForecastDiscussion />} />
        <Route path={"daily"} element={<DailyReport />} />
        <Route path={"weekly"} element={<WeeklyReport />} />
        <Route path={"3days"} element={<ThreeDaysReport />} />
        <Route path={"27days"} element={<TwentySevenDayOutlook />} />
        <Route path={"geoalert"} element={<GeoAlert />} />
      </Route>
      <Route path={"about"} element={<About />} />
    </Routes>
  );
};

export default App;
