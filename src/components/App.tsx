import "./App.css";
import Home from "./pages/Home";
import Forecasts from "./pages/Forecasts";
import About from "./pages/About";
import { Routes, Route } from "react-router-dom";
import ForecastDiscussion from "./pages/forecasts/Discussion";
import GeoAlert from "./pages/forecasts/GeoAlert";
import WeeklyReport from "./pages/forecasts/Weekly";
import TwentySevenDays from "./pages/forecasts/27days";
import ThreeDaysReport from "./pages/forecasts/3days";
import DailyReport from "./pages/forecasts/Daily";

//let basePath = ""; //process.env.REACT_APP_PUBLIC_URL + "/";

// const queryString = require("query-string");
// var parsedURLQuery = queryString.parse(window.location.search);
// let redirection;
// if (parsedURLQuery.redirect !== undefined) {
//   redirection = parsedURLQuery.redirect;
//   if (
//     "hasOwnProperty(redirection) &&
//     //@ts-ignore
//     window.location.pathname !== paths[redirection]
//   ) {
//     //@ts-ignore
//     window.location.pathname = paths[redirection];
//   }
// }

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
        <Route path={"27days"} element={<TwentySevenDays />} />
        <Route path={"geoalert"} element={<GeoAlert />} />
      </Route>
      <Route path={"about"} element={<About />} />
    </Routes>
  );
};

export default App;
