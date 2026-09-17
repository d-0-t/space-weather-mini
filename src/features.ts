/**
 * Feature flags – experimental sections hidden behind a flag until they
 * prove themselves. Alerts ship enabled; flip off per build with
 * `VITE_ALERTS_ENABLED=false` (e.g.
 * `VITE_ALERTS_ENABLED=false vite build`).
 */
export const ALERTS_ENABLED = import.meta.env.VITE_ALERTS_ENABLED !== "false";