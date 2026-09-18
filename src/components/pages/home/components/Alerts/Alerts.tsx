import { useEffect, useId, useRef } from "react";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import { formatAge, formatShort } from "../../../../../products/display-time";
import { useDisplayTimezone } from "../../../../DisplayTimezone/DisplayTimezoneContext";
import { gLabelForThreshold } from "../../../../../products/thresholds";
import { kpClass } from "../kp-panel/kp-panel";
import { useAlerts } from "./AlertsContext";

import "./Alerts.scss";

/**
 * The alert settings inside the alert settings modal – a threshold slider,
 * the browser-alerts permission and a single strip for the newest match at
 * the chaser's threshold. All polling, filtering and notification logic
 * lives in AlertsProvider, so the modal can unmount (closed) without
 * stopping alerts. The visible heading carries the dialog's accessible name
 * via headingId (the Time modal pattern). The dialog drives the slider from
 * a discardable draft; standalone use binds it straight to storage. A denied
 * permission offers Try again (browsers only re-prompt once site settings
 * allow it) with an orange warning explaining the settings path.
 */
const Alerts: React.FC<{
  headingId?: string;
  threshold?: number;
  setThreshold?: (kp: number) => void;
}> = ({
  headingId,
  threshold: thresholdProp,
  setThreshold: setThresholdProp,
}) => {
  const { displayTimezone } = useDisplayTimezone();
  const {
    match,
    threshold: storedThreshold,
    setThreshold: saveThreshold,
    notificationState,
    enableBrowserAlerts,
    pushSubscription,
    disablePushAlerts,
    sendTestPoke,
    testPokeState,
    simulateTestAlert,
    bannerPending,
    bannerError,
    staleAge,
    staleWarning,
  } = useAlerts();
  const threshold = thresholdProp ?? storedThreshold;
  const setThreshold = setThresholdProp ?? saveThreshold;

  const gLabel = gLabelForThreshold(threshold);
  const notificationsSupported = typeof Notification !== "undefined";
  const blockedWarningId = useId();

  // Resolving permission swaps the button for status copy; move focus to
  // what replaced it so keyboard users are not dropped to <body>.
  const grantedStatusRef = useRef<HTMLParagraphElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const prevPermissionRef = useRef(notificationState);
  useEffect(() => {
    if (prevPermissionRef.current !== notificationState) {
      if (notificationState === "granted") grantedStatusRef.current?.focus();
      if (notificationState === "denied") retryRef.current?.focus();
    }
    prevPermissionRef.current = notificationState;
  }, [notificationState]);

  return (
    <section className="alerts">
      <div className="alerts__header">
        <h3 id={headingId}>Alerts</h3>
      </div>

      {notificationsSupported ? (
        notificationState === "granted" ? (
          <p ref={grantedStatusRef} tabIndex={-1} className="alerts__status">
            Browser alerts enabled.
          </p>
        ) : notificationState === "denied" ? (
          <>
            <button
              ref={retryRef}
              type="button"
              className="btn--secondary"
              onClick={enableBrowserAlerts}
              aria-describedby={blockedWarningId}
            >
              Try again
            </button>
            <p id={blockedWarningId} className="alerts__warning">
              <span>
                <WarningAmberIcon
                  fontSize="small"
                  className="alerts__warning__icon"
                  aria-hidden="true"
                />{" "}
                Browser alerts are blocked for this site. Allow notifications in
                your browser settings, then try again.
              </span>
            </p>
          </>
        ) : (
          <button
            type="button"
            className="btn--secondary"
            onClick={enableBrowserAlerts}
          >
            Enable browser alerts
          </button>
        )
      ) : null}

      {pushSubscription ? (
        <div className="alerts__background">
          <p className="alerts__status">Background alerts on.</p>
          <button
            type="button"
            className="btn--secondary"
            onClick={() => {
              void sendTestPoke();
            }}
          >
            Send test poke
          </button>
          <button
            type="button"
            className="btn--secondary"
            onClick={() => {
              void disablePushAlerts();
            }}
          >
            Disable background alerts
          </button>
          <p className="alerts__test-poke-state" aria-live="polite">
            {testPokeState === "sent" ? "Test poke sent." : null}
            {testPokeState === "failed" ? "Test poke failed: check back later." : null}
          </p>
        </div>
      ) : null}

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

      <p className="alerts__footnote">
        Notifications can appear while this tab is open, even in the
        background.
      </p>

      {/* Dev-only manual hook (hidden from production builds): fires the
          canned test notification through the same path as live matches. 
          Commented out, but don't delete. */}
      {/* {import.meta.env.DEV && notificationsSupported ? (
        <button
          type="button"
          className="btn--secondary alerts__test"
          onClick={simulateTestAlert}
          disabled={notificationState !== "granted"}
        >
          Send test alert
        </button>
      ) : null} */}

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
                As of {formatShort(match.time, displayTimezone)}.
                {match.kind !== "forecast"
                  ? ` Updated ${formatAge(match.time)}`
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
