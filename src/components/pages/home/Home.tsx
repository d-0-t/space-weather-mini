import { useRef, useState } from "react";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";

import "../Pages.scss";
import "./Home.scss";
import AuroraNow from "./components/AuroraNow/AuroraNow";
import Forecast from "./components/Forecast/Forecast";
import SolarWind from "./components/SolarWind/SolarWind";
import Magnetosphere from "./components/Magnetosphere/Magnetosphere";
import { AlertsProvider } from "./components/Alerts/AlertsContext";
import AlertsDialog from "./components/Alerts/AlertsDialog";
import { ALERTS_ENABLED } from "../../../features";

const COMPACT_VIEW_KEY = "compact-view";

const Home: React.FC = () => {
  const [compact, setCompact] = useState(
    () => localStorage.getItem(COMPACT_VIEW_KEY) === "on",
  );
  const alertsButtonRef = useRef<HTMLButtonElement>(null);
  const alertsDialogRef = useRef<HTMLDialogElement>(null);

  const handleCompactChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.checked;
    setCompact(next);
    localStorage.setItem(COMPACT_VIEW_KEY, next ? "on" : "off");
  };

  return (
    <AlertsProvider>
      <div className={compact ? "home home--compact" : "home"}>
        <div className="home__header">
          <h1>Dashboard</h1>
          <div className="home__header-controls">
            <label className="btn--icon home__compact-toggle">
              <input
                type="checkbox"
                checked={compact}
                onChange={handleCompactChange}
              />
              Compact view
            </label>
            {ALERTS_ENABLED ? (
              <button
                type="button"
                className="btn--icon home__alerts-toggle"
                title="Alerts"
                ref={alertsButtonRef}
                onClick={() => alertsDialogRef.current?.showModal()}
              >
                <NotificationsActiveIcon fontSize="small" />
                <span className="btn__label">Alerts</span>
              </button>
            ) : null}
          </div>
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
        {ALERTS_ENABLED ? (
          <AlertsDialog
            dialogRef={alertsDialogRef}
            triggerRef={alertsButtonRef}
            onClose={() => alertsDialogRef.current?.close()}
          />
        ) : null}
      </div>
    </AlertsProvider>
  );
};

export default Home;