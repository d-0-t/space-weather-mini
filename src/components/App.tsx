import "./App.scss";
import Home from "./pages/home/Home";
import Forecasts from "./pages/Forecasts";
import About from "./pages/About";
import { Routes, Route } from "react-router-dom";
import ForecastDiscussion from "./pages/forecasts/forecast-discussion";
import GeophysicalAlert from "./pages/forecasts/geophysical-alert";
import WeeklyReport from "./pages/forecasts/weekly-report";
import TwentySevenDayOutlook from "./pages/forecasts/27-day-outlook";
import ThreeDayForecast from "./pages/forecasts/3-day-forecast";
import DailyGeomagneticIndices from "./pages/forecasts/daily-geomagnetic-indices";
import Explainers from "./pages/explainers";

const App: React.FC = () => {
  return (
    <Routes>
      <Route path={""} element={<Home />} />
      <Route path={"home"} element={<Home />} />
      <Route path={"forecasts"} element={<Forecasts />}>
        <Route index element={<ForecastDiscussion />} />
        <Route path={"discussion"} element={<ForecastDiscussion />} />
        <Route path={"daily"} element={<DailyGeomagneticIndices />} />
        <Route path={"weekly"} element={<WeeklyReport />} />
        <Route path={"3days"} element={<ThreeDayForecast />} />
        <Route path={"27days"} element={<TwentySevenDayOutlook />} />
        <Route path={"geoalert"} element={<GeophysicalAlert />} />
      </Route>
      <Route path={"about"} element={<About />} />
      <Route path={"explainers"} element={<Explainers />} />
    </Routes>
  );
};

export default App;
