import { useEffect, useId, useRef } from "react";
import { Link } from "react-router-dom";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import { formatAge, formatShort } from "../../../../../products/display-time";
import { useDisplayTimezone } from "../../../../DisplayTimezone/DisplayTimezoneContext";
import { gLabelForThreshold } from "../../../../../products/thresholds";
import { kpClass } from "../kp-panel/kp-panel";
import {
  loadGeocodedPlace,
  PLACE_STORAGE_KEY,
} from "../../../../../data/place-storage";
import HelpPopover from "../../../../HelpPopover/HelpPopover";
import {
  DARKNESS_BANDS,
  type AlertTypeToggles,
  type DarknessBand,
  type HindranceGates,
} from "../../../../../push/subscription-settings";
import { kpTip } from "./kp-tip";
import { useAlerts } from "./AlertsContext";

import "./Alerts.scss";

/** The darkness gate's option copy, keyed by the stored band value. */
const DARKNESS_LABELS: Record<DarknessBand, string> = {
  night: "Night",
  astronomical: "Astronomical Twilight",
  nautical: "Nautical Twilight",
  any: "Any (including daytime)",
};

/** The select's options ride the validator's own band order, so the two
 * never drift: darkest first, Any last. */
const DARKNESS_OPTIONS: ReadonlyArray<{
  value: DarknessBand;
  label: string;
}> = DARKNESS_BANDS.map((value) => ({
  value,
  label: DARKNESS_LABELS[value],
}));

/**
 * The alert settings inside the alert settings modal – the Kp threshold
 * slider (with its Kp-scale explainer and place tip), the three background
 * alert types, the Live alert's hindrance gates at the stored place, the
 * browser-alerts permission and a single strip for the newest match at the
 * chaser's threshold. All polling, filtering and notification logic lives
 * in AlertsProvider, so the modal can unmount (closed) without stopping
 * alerts. The visible heading carries the dialog's accessible name via
 * headingId (the Time modal pattern). The dialog drives every setting from
 * a discardable draft; standalone use binds straight to storage. A denied
 * permission offers Try again (browsers only re-prompt once site settings
 * allow it) with an orange warning explaining the settings path; a granted
 * permission that still cannot subscribe or store gets its own honest
 * panel (the Install & Alerts guide link lands with ticket 07).
 */
const Alerts: React.FC<{
  headingId?: string;
  threshold?: number;
  setThreshold?: (kp: number) => void;
  alertTypes?: AlertTypeToggles;
  toggleAlertType?: (type: keyof AlertTypeToggles, on: boolean) => void;
  gates?: HindranceGates;
  setGates?: (next: HindranceGates) => void;
}> = ({
  headingId,
  threshold: thresholdProp,
  setThreshold: setThresholdProp,
  alertTypes: alertTypesProp,
  toggleAlertType: toggleAlertTypeProp,
  gates: gatesProp,
  setGates: setGatesProp,
}) => {
  const { displayTimezone } = useDisplayTimezone();
  const {
    match,
    threshold: storedThreshold,
    setThreshold: saveThreshold,
    alertTypes: storedAlertTypes,
    setAlertType,
    gates: storedGates,
    setGates: saveGates,
    notificationState,
    enableBrowserAlerts,
    pushSubscription,
    pushFailed,
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
  const alertTypes = alertTypesProp ?? storedAlertTypes;
  const toggleAlertType = toggleAlertTypeProp ?? setAlertType;
  const gates = gatesProp ?? storedGates;
  const setGates = setGatesProp ?? saveGates;

  const gLabel = gLabelForThreshold(threshold);
  const notificationsSupported = typeof Notification !== "undefined";
  const blockedWarningId = useId();
  const pushFailedWarningId = useId();
  // The tip speaks about the actually-stored place: loadGeocodedPlace
  // falls back to the app default, so a chaser who never picked a place
  // gets the generic tip line instead of a place that was never theirs.
  // The gate labels always name the loaded place – the sender judges the
  // gates at the same place collectSettings stores, default included.
  const place = loadGeocodedPlace(localStorage);
  const tip = kpTip(
    localStorage.getItem(PLACE_STORAGE_KEY) !== null ? place : null,
  );

  // Resolving permission swaps the button for status copy; move focus to
  // what replaced it so keyboard users are not dropped to <body>. A retry
  // after a failed enable lands on the "Background alerts on." status the
  // same way, once the subscription it was retrying for arrives.
  const grantedStatusRef = useRef<HTMLParagraphElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const backgroundStatusRef = useRef<HTMLParagraphElement>(null);
  const prevPermissionRef = useRef(notificationState);
  const prevPushFailedRef = useRef(pushFailed);
  useEffect(() => {
    if (prevPermissionRef.current !== notificationState) {
      if (notificationState === "granted") grantedStatusRef.current?.focus();
      if (notificationState === "denied") retryRef.current?.focus();
    }
    prevPermissionRef.current = notificationState;
    if (prevPushFailedRef.current && pushSubscription) {
      backgroundStatusRef.current?.focus();
    }
    prevPushFailedRef.current = pushFailed;
  }, [notificationState, pushSubscription, pushFailed]);

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

      {pushFailed && !pushSubscription ? (
        <>
          <button
            type="button"
            className="btn--secondary"
            onClick={enableBrowserAlerts}
            aria-describedby={pushFailedWarningId}
          >
            Try again
          </button>
          <p id={pushFailedWarningId} className="alerts__warning">
            <span>
              <WarningAmberIcon
                fontSize="small"
                className="alerts__warning__icon"
                aria-hidden="true"
              />{" "}
              Background alerts could not be enabled. They need the app
              installed on your phone&apos;s Home Screen. Read the install steps
              here:{" "}
              <Link to="/about/install-alerts#install">
                Install &amp; Alerts
              </Link>
              .
            </span>
          </p>
        </>
      ) : null}

      {pushSubscription ? (
        <div className="alerts__background">
          <p ref={backgroundStatusRef} tabIndex={-1} className="alerts__status">
            Background alerts on.
          </p>
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
            {testPokeState === "failed"
              ? "Test poke failed: check back later."
              : null}
          </p>
        </div>
      ) : null}

      <div className="alerts__threshold-row">
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
        <HelpPopover
          content={{
            label: "About the Kp alert threshold",
            text: "The Kp index is the planetary geomagnetic activity index on a 0–9 scale (0 quiet, 9 extreme storm); the G scale keys G1 to Kp 5 through G5 to Kp 9.",
          }}
          popoverClassName="alerts__popover"
        />
      </div>

      <p className="alerts__tip">
        {tip
          ? tip
          : "The Possible locations panel names the towns inside the oval's current reach."}
      </p>

      <fieldset className="alerts__types">
        <legend>Background alert types</legend>
        <label className="alerts__types__type">
          <input
            type="checkbox"
            checked={alertTypes.daily}
            onChange={(event) => toggleAlertType("daily", event.target.checked)}
          />
          Daily outlook alert
        </label>
        <label className="alerts__types__type">
          <input
            type="checkbox"
            checked={alertTypes.kp}
            onChange={(event) => toggleAlertType("kp", event.target.checked)}
          />
          Kp alert
        </label>
        <label className="alerts__types__type">
          <input
            type="checkbox"
            checked={alertTypes.live}
            onChange={(event) => toggleAlertType("live", event.target.checked)}
          />
          Live alert
        </label>
      </fieldset>

      <hr className="alerts__divider" />

      <fieldset className="alerts__gates">
        <legend>Live alert settings at {place.shortName}</legend>
        <label className="alerts__gates__gate">
          <input
            type="checkbox"
            checked={!gates.noPrecipitation}
            onChange={(event) =>
              setGates({ ...gates, noPrecipitation: !event.target.checked })
            }
          />
          Show aurora alerts when it&apos;s raining or snowing
        </label>
        <label className="alerts__gates__gate alerts__gates__gate--stacked">
          <span>Only show alerts when cloud coverage is below:</span>
          <span className="alerts__gates__control">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={gates.cloudMaxPercent}
              onChange={(event) =>
                setGates({
                  ...gates,
                  cloudMaxPercent: Number(event.target.value),
                })
              }
            />
            <output>{gates.cloudMaxPercent}%</output>
          </span>
        </label>
        <label className="alerts__gates__gate alerts__gates__gate--stacked">
          <span>Only show alerts when it&apos;s at least this dark:</span>
          <select
            value={gates.darknessBand}
            onChange={(event) => {
              const selected = DARKNESS_OPTIONS.find(
                (option) => option.value === event.target.value,
              );
              if (selected) {
                setGates({ ...gates, darknessBand: selected.value });
              }
            }}
          >
            {DARKNESS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <p className="alerts__install-hint">
        For background alerts with the app closed, add this app to your
        phone&apos;s Home Screen.
      </p>

      <p className="alerts__footnote">
        Notifications can appear while this tab is open, even in the background.
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
