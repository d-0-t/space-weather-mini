import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * The one hash-scroll owner: scrolls to the element the URL hash names on
 * every hash change, so a deep-linked page (Explainers, Install & Alerts)
 * lands on its heading, including a first load straight from the address
 * bar. Reads the router's hash and falls back to window.location.hash
 * because a static-host entry never re-renders the router for a bare hash.
 */
export function useHashScroll(): void {
  const location = useLocation();
  useEffect(() => {
    const hash = location.hash || window.location.hash;
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    }
  }, [location.hash]);
}
