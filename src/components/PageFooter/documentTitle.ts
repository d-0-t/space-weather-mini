import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Static route to h1 map for the Document title.
 * The browser tab reads `{H1} – Space Weather` with no dynamic suffixes:
 * Time and Astro state never affect it. Static only, so back/forward
 * navigation flows through the same location change.
 */
const ROUTE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/home": "Dashboard",
  "/webcams": "Webcams",
  "/conditions": "Local conditions",
  "/forecasts": "Forecast Discussion",
  "/forecasts/discussion": "Forecast Discussion",
  "/forecasts/daily": "Daily Geomagnetic Indices",
  "/forecasts/weekly": "Weekly Report",
  "/forecasts/3days": "3-Day Forecast",
  "/forecasts/27days": "27-Day Outlook",
  "/forecasts/geoalert": "Geophysical Observations and Predictions",
  "/about": "This site",
  "/about/sources": "Sources",
  "/about/install-alerts": "Install & Alerts",
  "/about/guide": "Aurora guide",
  "/explainers": "Explainers",
};

/**
 * The tab text for a pathname: `{H1} – Space Weather`.
 * Unknown paths fall back to the bare app name.
 */
export function routeToDocumentTitle(pathname: string): string {
  const h1 = ROUTE_TITLES[pathname];
  if (!h1) return "Space Weather";
  return `${h1} – Space Weather`;
}

/**
 * Keeps the Document title in sync with the route on every location
 * change, including push, back and forward.
 */
export function useDocumentTitle(): void {
  const location = useLocation();
  useEffect(() => {
    document.title = routeToDocumentTitle(location.pathname);
  }, [location.pathname]);
}

export default useDocumentTitle;
