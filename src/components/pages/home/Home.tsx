import { useState } from "react";

import "../Pages.scss";
import "./Home.scss";
import AuroraNow from "./components/AuroraNow/AuroraNow";
import Forecast from "./components/Forecast/Forecast";
import SolarWind from "./components/SolarWind/SolarWind";
import Magnetosphere from "./components/Magnetosphere/Magnetosphere";

const Home: React.FC = () => {
  const [compact, setCompact] = useState(false);

  return (
    <div className={compact ? "home home--compact" : "home"}>
      <div className="home__header">
        <h1>Dashboard</h1>
        <label className="home__compact-toggle">
          <input
            type="checkbox"
            checked={compact}
            onChange={(event) => setCompact(event.target.checked)}
          />
          Compact view
        </label>
      </div>
      <div className="home__flow">
        <div className="home__flow__col">
          <AuroraNow />
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