import { useState } from "react";

import "../Pages.scss";
import "./Home.scss";
import AuroraNow from "./components/AuroraNow/AuroraNow";
import Forecast from "./components/Forecast/Forecast";
import SolarWind from "./components/SolarWind/SolarWind";
import Magnetosphere from "./components/Magnetosphere/Magnetosphere";
import { AlertsProvider } from "./components/Alerts/AlertsContext";

const COMPACT_VIEW_KEY = "compact-view";

const Home: React.FC = () => {
  const [compact, setCompact] = useState(
    () => localStorage.getItem(COMPACT_VIEW_KEY) === "on",
  );

  const handleCompactChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.checked;
    setCompact(next);
    localStorage.setItem(COMPACT_VIEW_KEY, next ? "on" : "off");
  };

  return (
    <div className={compact ? "home home--compact" : "home"}>
      <div className="home__header">
        <h1>Dashboard</h1>
        <label className="btn--secondary home__compact-toggle">
          <input
            type="checkbox"
            checked={compact}
            onChange={handleCompactChange}
          />
          Compact view
        </label>
      </div>
      <div className="home__flow">
        <div className="home__flow__col">
          <AlertsProvider>
            <AuroraNow />
          </AlertsProvider>
          <Forecast />
        </div>
        <div className="home__flow__col">
          <SolarWind />
          <Magnetosphere />
        </div>
      </div>
    </div>
  );
};

export default Home;