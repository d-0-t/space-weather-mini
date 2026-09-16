import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";

import "../Pages.scss";
import "./Home.scss";
import AuroraNow from "./components/AuroraNow/AuroraNow";
import SummaryPanel from "./components/AuroraNow/SummaryPanel";
import OvalGlow from "./components/AuroraNow/OvalGlow";
import PossibleLocationsPanel from "./components/AuroraNow/PossibleLocationsPanel";
import Forecast from "./components/Forecast/Forecast";
import SolarWind from "./components/SolarWind/SolarWind";
import Magnetosphere from "./components/Magnetosphere/Magnetosphere";
import PinnedWebcams from "./components/PinnedWebcams/PinnedWebcams";
import { AlertsProvider } from "./components/Alerts/AlertsContext";
import AlertsDialog from "./components/Alerts/AlertsDialog";
import { ALERTS_ENABLED } from "../../../features";

import { getBucketColumns, loadDashboardLayout, useLayoutBucket } from "./dashboardLayout";
import type { DashboardPanelId } from "./dashboardLayout";

const COMPACT_VIEW_KEY = "compact-view";

/** Dashboard panel registry: stable id to its collapsible unit. */
const PANEL_REGISTRY: Record<DashboardPanelId, React.FC> = {
  "aurora-now": AuroraNow,
  "pinned-webcams": PinnedWebcams,
  summary: SummaryPanel,
  "oval-glow": OvalGlow,
  "possible-locations": PossibleLocationsPanel,
  "solar-wind": SolarWind,
  magnetosphere: Magnetosphere,
  forecast: Forecast,
};

const Home: React.FC = () => {
  const location = useLocation();
  const [compact, setCompact] = useState(
    () => localStorage.getItem(COMPACT_VIEW_KEY) === "on",
  );
  const alertsButtonRef = useRef<HTMLButtonElement>(null);
  const alertsDialogRef = useRef<HTMLDialogElement>(null);

  // Deep links from the Aurora guide ("/#view-distance", "/#oval-glow"): the
  // Aurora Now panels mount only after their feeds land, so scroll when the
  // target element first appears rather than at mount alone.
  useEffect(() => {
    const id = location.hash.slice(1);
    if (!id) return;
    let observer: MutationObserver | null = null;
    const scrollToTarget = (): void => {
      const target = document.getElementById(id);
      if (!target) return;
      target.scrollIntoView();
      observer?.disconnect();
    };
    scrollToTarget();
    if (!document.getElementById(id)) {
      observer = new MutationObserver(scrollToTarget);
      observer.observe(
        document.getElementById("main-content") ?? document.body,
        { childList: true, subtree: true },
      );
    }
    return () => observer?.disconnect();
  }, [location.hash]);

  const [layout] = useState(() => loadDashboardLayout(localStorage));
  const bucket = useLayoutBucket();
  // Columns for the active Layout bucket, verbatim: empty columns collapse
  // (no wrapper element), unknown future ids render nothing but stay in
  // storage via loadDashboardLayout.
  const columns = getBucketColumns(layout, bucket).filter(
    (column) => column.length > 0,
  );

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
            <label className="btn--secondary home__compact-toggle">
              <input
                type="checkbox"
                checked={compact}
                onChange={handleCompactChange}
              />
              <span className="btn__label">Compact view</span>
            </label>
            {ALERTS_ENABLED ? (
              <button
                type="button"
                className="btn--secondary home__alerts-toggle"
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
        {/* Dashboard panels per Layout bucket (ticket 04): the 1-column
            list, the 2-column A/B pair and the 3-column A/B/C triple each
            own their column membership; resizing switches buckets
            immediately via useLayoutBucket. Column count is driven by the
            rendered columns; the grid fractions ride the viewport width in
            Home.scss through the same md/xl/landscape queries. */}
        <div className="home__flow">
          {columns.map((column, index) => (
            <div className="home__flow__col" key={index}>
              {column.map((id) => {
                const Panel = PANEL_REGISTRY[id];
                if (!Panel) return null;
                return <Panel key={id} />;
              })}
            </div>
          ))}
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