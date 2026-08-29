import {
  formatAge,
  formatUtcShort,
} from "../../../../../products/live-helpers";
import { gLabelForThreshold } from "../../../../../products/thresholds";
import { kpClass } from "../kp-panel/kp-panel";
import { useAlerts } from "./AlertsContext";

import "./Alerts.scss";

/**
 * The alert strip on the Aurora Now panel – a single strip for the newest
 * match at the chaser's threshold. All polling, filtering and notification
 * logic lives in AlertsProvider, so the strip can unmount (panel collapsed)
 * without stopping alerts.
 */
const Alerts: React.FC = () => {
  const {
    match,
    threshold,
    setThreshold,
    notificationState,
    enableBrowserAlerts,
    bannerPending,
    bannerError,
    staleAge,
    staleWarning,
  } = useAlerts();

  const gLabel = gLabelForThreshold(threshold);
  const notificationsSupported = typeof Notification !== "undefined";

  return (
    <section className="alerts">
      <div className="alerts__header">
        <h3>Alerts</h3>
        {notificationsSupported ? (
          <button
            type="button"
            className="btn--icon"
            onClick={enableBrowserAlerts}
            disabled={
              notificationState === "granted" || notificationState === "denied"
            }
          >
            {notificationState === "granted"
              ? "Browser alerts enabled"
              : notificationState === "denied"
                ? "Browser alerts blocked"
                : "Enable browser alerts"}
          </button>
        ) : null}
      </div>

      <label className="alerts__threshold">
        <span className="alerts__threshold__label">Kp alert threshold</span>
        <input
          type="range"
          min={1}
          max={9}
          step={1}
          value={threshold}
          aria-valuetext={`Kp ${threshold}${gLabel ? ` (${gLabel})` : ""}`}
          onChange={(event) => setThreshold(Number(event.target.value))}
        />
        <output className="alerts__threshold__value">
          {threshold}
          {gLabel ? ` (${gLabel})` : ""}
        </output>
      </label>

      <p className="alerts__footnote">Alerts while this tab is open.</p>

      <div className="alerts__banner" aria-live="polite">
        {bannerPending ? (
          <p>Loading alerts…</p>
        ) : bannerError ? (
          <p>Couldn&apos;t load alerts. Please check back later.</p>
        ) : match ? (
          <div className="alerts__strip">
            {match.kp !== null ? (
              <span
                className={`alerts__strip__color ${kpClass(match.kp)}`}
                aria-hidden="true"
              />
            ) : null}
            <div className="alerts__strip__body">
              <p className="alerts__item__title">
                {match.kind === "alert" ? match.snippet : match.title}
              </p>
              <p className="alerts__item__meta">
                As of {formatUtcShort(match.time)}
                {match.kind !== "forecast"
                  ? ` · Updated ${formatAge(match.time)}`
                  : ""}
              </p>
            </div>
          </div>
        ) : (
          <p>No alerts at Kp {threshold} or higher right now.</p>
        )}
      </div>
      {staleWarning && staleAge ? (
        <p aria-live="polite">
          ⚠ Live data unavailable – showing {formatAge(staleAge)}-old cache
        </p>
      ) : null}
    </section>
  );
};

export default Alerts;
