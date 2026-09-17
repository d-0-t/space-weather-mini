import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";

import {
  ALERTS_URL,
  alertKey,
  alertSnippet,
  alertTitle,
  forecastBreachInNext24h,
  loadSeenAlertKeys,
  matchingAlerts,
  newestAlertTime,
  parseAlerts,
  saveSeenAlertKeys,
} from "../../../../../products/alerts";
import {
  formatAge,
  parseTimeTag,
} from "../../../../../products/display-time";
import {
  NOAA_SCALES_URL,
  gScaleOf,
  parseNoaaScales,
} from "../../../../../products/noaa-scales";
import {
  NOAA_PLANETARY_K_INDEX_FORECAST_URL,
  parsePlanetaryKIndexForecast,
} from "../../../../../products/noaa-planetary-k-index";
import {
  gScaleForKp,
  loadKpThreshold,
  saveKpThreshold,
} from "../../../../../products/thresholds";

const fetchAlerts = async () => {
  const response = await fetch(ALERTS_URL);
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return parseAlerts(await response.text());
};

const fetchScales = async () => {
  const response = await fetch(NOAA_SCALES_URL);
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return parseNoaaScales(await response.text());
};

const fetchKpForecast = async () => {
  const response = await fetch(NOAA_PLANETARY_K_INDEX_FORECAST_URL);
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return parsePlanetaryKIndexForecast(await response.text());
};

/** Fires a system notification, preferring the service worker so mobile
 * browsers (which throw on `new Notification`) still work. Uses
 * getRegistration, never `.ready` – `.ready` pends forever when no worker
 * is registered (vite dev serves none), which would hang past the
 * Notification fallback and silence dev entirely. */
const showBrowserNotification = async (title: string, body: string) => {
  if (typeof Notification === "undefined") return;
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, { body });
      return;
    }
  } catch {
    // no usable worker – fall through to the Notification API
  }
  try {
    new Notification(title, { body });
  } catch {
    // mobile browsers throw on new Notification – the in-app strip still shows
  }
};

interface AlertMatch {
  /** Dedup key: product_id|issue_datetime for alerts, stable keys otherwise. */
  key: string;
  /** Issue time of the match, as sent by SWPC (UTC). */
  time: string;
  /** Short human title for the strip and system notification. */
  title: string;
  /** Actionable message line, alerts only. */
  snippet?: string;
  /** Kp level the strip's dot is colored for (from the code or G scale). */
  kp: number | null;
  kind: "current" | "alert" | "forecast";
}

type NotificationState = NotificationPermission | "unsupported";

interface AlertsContextValue {
  /** Newest match for the chaser's threshold, or null when none. */
  match: AlertMatch | null;
  /** Persisted Kp threshold (1–9). */
  threshold: number;
  /** Updates and persists the threshold. */
  setThreshold: (kp: number) => void;
  notificationState: NotificationState;
  /** Asks for Notification permission on user gesture (iOS-safe). */
  enableBrowserAlerts: () => Promise<void>;
  /** Fires a canned test notification (manual PWA check, no feed needed). */
  simulateTestAlert: () => void;
  /** True while the alerts feed is loading without cached data. */
  bannerPending: boolean;
  /** True when the alerts feed failed without cached data. */
  bannerError: boolean;
  /** Newest issue time of the cached alerts feed (for the stale advisory). */
  staleAge: string | null;
  /** True when a live leg failed while a cached match exists. */
  staleWarning: boolean;
}

const AlertsContext = createContext<AlertsContextValue | null>(null);

/**
 * Owns the alerts polling, threshold and notifications for the whole Home
 * session. Mounted outside any collapsible panel, so closing the alert
 * settings modal never stops polling – polling and browser notifications
 * keep going while the tab is open, including in a hidden tab (the PWA
 * background case). The modal is mounted only while open.
 */
export const AlertsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [threshold, setThresholdState] = useState(() =>
    loadKpThreshold(localStorage),
  );
  const [notificationState, setNotificationState] = useState<NotificationState>(
    () =>
      typeof Notification !== "undefined"
        ? Notification.permission
        : "unsupported",
  );

  const alertsQuery = useQuery({
    queryKey: ["alerts", "live"],
    queryFn: fetchAlerts,
    refetchInterval: 5 * 60 * 1000,
    // True so an installed PWA (or a minimized tab) keeps polling NOAA
    // while hidden; the in-app strip and system notifications stay live.
    refetchIntervalInBackground: true,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const scalesQuery = useQuery({
    queryKey: ["noaa-scales", "live"],
    queryFn: fetchScales,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: true,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const forecastQuery = useQuery({
    queryKey: ["planetary-k-index-forecast", "live"],
    queryFn: fetchKpForecast,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: true,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  /** Strongest Kp forecast breach inside the next 24h, if any. Kept out of
   * the match memo so the forecast notification effect can edge-trigger on
   * it directly (new event or rising Kp pings; same or easing stays silent).
   */
  const breach = useMemo(
    () =>
      forecastBreachInNext24h(
        forecastQuery.data ?? [],
        threshold,
        Date.now(),
      ),
    [forecastQuery.data, threshold],
  );

  const match = useMemo<AlertMatch | null>(() => {
    const gThreshold = gScaleForKp(threshold);
    const currentScale = scalesQuery.data
      ? gScaleOf(scalesQuery.data.current.G.Scale)
      : null;
    const list: AlertMatch[] = [];
    if (currentScale !== null && currentScale >= gThreshold) {
      list.push({
        key: `scales:current:${currentScale}`,
        time: scalesQuery.data!.issued,
        title: `G${currentScale} geomagnetic storm in progress`,
        kp: currentScale + 4,
        kind: "current",
      });
    }
    for (const alert of matchingAlerts(alertsQuery.data ?? [], threshold)) {
      list.push({
        key: alertKey(alert),
        time: alert.issue_datetime,
        title: alertTitle(alert),
        snippet: alertSnippet(alert),
        kp: alert.kp ?? (alert.gScale !== null ? alert.gScale + 4 : null),
        kind: "alert",
      });
    }
    if (breach) {
      list.push({
        key: `forecast:${breach.time_tag}`,
        time: breach.time_tag,
        title: `Kp ${breach.kp} predicted within 24h`,
        kp: breach.kp,
        kind: "forecast",
      });
    }
    list.sort((a, b) => parseTimeTag(b.time) - parseTimeTag(a.time));
    return list[0] ?? null;
  }, [alertsQuery.data, scalesQuery.data, breach, threshold]);

  // Observed kinds (a storm in progress, an issued alert) fire system
  // notifications once per unseen key while permission is granted; the body
  // carries the issue age so a late-seen ping reads honestly.
  useEffect(() => {
    if (notificationState !== "granted") return;
    if (!match || match.kind === "forecast") return;
    const seen = new Set(loadSeenAlertKeys(localStorage));
    if (seen.has(match.key)) return;
    const body = match.snippet
      ? `${match.snippet}\nUpdated ${formatAge(match.time)}.`
      : "";
    void showBrowserNotification(match.title, body);
    saveSeenAlertKeys(localStorage, [...seen, match.key]);
  }, [match, notificationState]);

  // The forecast leg is a 24h prediction whose key re-cuts as its window
  // slides, so a pure seen-set would ping on nearly every poll. Edge-trigger
  // instead: a new event or a rising Kp pings once per key; the same or an
  // easing forecast only moves the in-app strip.
  const prevForecastKp = useRef<number | null>(null);
  useEffect(() => {
    if (notificationState !== "granted") return;
    if (!breach) {
      prevForecastKp.current = null;
      return;
    }
    const prev = prevForecastKp.current;
    prevForecastKp.current = breach.kp;
    if (prev !== null && breach.kp <= prev) return;
    const key = `forecast:${breach.time_tag}`;
    const seen = new Set(loadSeenAlertKeys(localStorage));
    if (seen.has(key)) return;
    void showBrowserNotification(`Kp ${breach.kp} predicted within 24h`, "");
    saveSeenAlertKeys(localStorage, [...seen, key]);
  }, [breach, notificationState]);

  const setThreshold = (next: number) => {
    setThresholdState(next);
    saveKpThreshold(localStorage, next);
  };

  const enableBrowserAlerts = async () => {
    if (typeof Notification === "undefined") return;
    try {
      setNotificationState(await Notification.requestPermission());
    } catch {
      // iOS Safari throws on requestPermission for non-standalone pages
      setNotificationState("default");
    }
  };

  const simulateTestAlert = () => {
    void showBrowserNotification(
      "Test alert – Geomagnetic K-index of 5 expected",
      "This is a test notification from the Space Weather app.",
    );
  };

  const staleAge = alertsQuery.data
    ? newestAlertTime(alertsQuery.data)
    : null;
  const value: AlertsContextValue = {
    match,
    threshold,
    setThreshold,
    notificationState,
    enableBrowserAlerts,
    simulateTestAlert,
    bannerPending: alertsQuery.isPending && !alertsQuery.data,
    bannerError: alertsQuery.isError && !alertsQuery.data,
    staleAge,
    staleWarning:
      (alertsQuery.isError ||
        scalesQuery.isError ||
        forecastQuery.isError) &&
      staleAge !== null,
  };

  return (
    <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>
  );
};

/** The alerts state, for the strip UI inside Aurora Now. */
export function useAlerts(): AlertsContextValue {
  const value = useContext(AlertsContext);
  if (!value) {
    throw new Error("useAlerts must be used inside AlertsProvider");
  }
  return value;
}