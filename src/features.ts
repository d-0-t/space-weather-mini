/**
 * Feature flags – experimental sections hidden behind a flag until they
 * prove themselves. Flip via a VITE_* env var at build time (e.g.
 * `VITE_ALERTS_ENABLED=true vite build`); the default is off.
 */
export const ALERTS_ENABLED = import.meta.env.VITE_ALERTS_ENABLED === "true";