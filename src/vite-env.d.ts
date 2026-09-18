/// <reference types="vite/client" />

/**
 * The build env the app reads: the alerts feature flag (features.ts) and
 * the sender's VAPID application server key (push foundation, ticket 02),
 * set once in the Netlify dashboard; the private key never reaches here.
 */
interface ImportMetaEnv {
  readonly VITE_ALERTS_ENABLED?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
