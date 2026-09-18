/**
 * The owned service worker's declarative route table (ticket 02): the same
 * caching contract the generated worker carried, now as data so the route
 * table is pinned by unit tests and the worker source stays a thin adapter.
 * Routes match in order – first match wins – so the OVATION image route is
 * kept free of the broader SWPC data route's shadow.
 */

/** One runtime-caching route of the owned service worker. */
export interface SWRouteConfig {
  /** RegExp source the worker compiles into a route pattern. */
  patternSource: string;
  handler: "StaleWhileRevalidate" | "CacheFirst";
  cacheName: string;
  expiration: { maxEntries: number; maxAgeSeconds: number };
}

/**
 * Precache globs: the shell (JS, CSS, HTML, the woff2 fonts) plus the
 * bundled Natural Earth land asset behind the Oval glow's basemap. Data
 * products and images are runtime-cached, never precached.
 */
export const SW_GLOB_PATTERNS = ["**/*.{js,css,html,woff2,geojson}"];

/** Every SPA navigation (deep links included) is answered with the shell. */
export const SW_NAVIGATE_FALLBACK = "index.html";

/**
 * Seven days, not one hour: Workbox ExpirationPlugin refuses to serve
 * entries older than maxAgeSeconds, and the offline promise is that the
 * last fetched products survive an offline stretch.
 */
const SEVEN_DAYS = 604800;

/** The runtime routes, in match order. */
export const SW_RUNTIME_ROUTES: readonly SWRouteConfig[] = [
  {
    patternSource: "services\\.swpc\\.noaa\\.gov\\/(json|text|products)",
    handler: "StaleWhileRevalidate",
    cacheName: "swpc",
    expiration: { maxEntries: 50, maxAgeSeconds: SEVEN_DAYS },
  },
  {
    patternSource:
      "services\\.swpc\\.noaa\\.gov\\/images\\/animations\\/ovation",
    handler: "CacheFirst",
    cacheName: "ovation-jpg",
    expiration: { maxEntries: 30, maxAgeSeconds: SEVEN_DAYS },
  },
  {
    // Country flags (flagcdn) never change per size: CacheFirst keeps
    // the place pill, daily forecast and webcam rows intact offline.
    patternSource: "flagcdn\\.com",
    handler: "CacheFirst",
    cacheName: "flags",
    expiration: { maxEntries: 60, maxAgeSeconds: SEVEN_DAYS },
  },
];
