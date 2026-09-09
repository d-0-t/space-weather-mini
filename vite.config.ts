import react from "@vitejs/plugin-react";
import { VitePWA, type VitePWAOptions } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

/**
 * Offline PWA options (ADR-0006): a build-time `generateSW` service worker
 * that precaches the shell (including the bundled Natural Earth land asset
 * behind the Oval glow's basemap) and runtime-caches NOAA data and OVATION
 * aurora JPGs. The app ships its own `public/manifest.json`
 * (`manifest: false`); `includeAssets` precaches the favicon and the icon
 * assets that manifest references. Workbox matches runtime routes in
 * order, so the OVATION image route is kept free of the broader data
 * route's shadow.
 */
export const PWA_OPTIONS = {
  strategies: "generateSW",
  registerType: "autoUpdate",
  manifest: false,
  includeAssets: ["favicon.ico", "assets/*"],
  workbox: {
    globPatterns: ["**/*.{js,css,html,woff2,geojson}"],
    skipWaiting: true,
    clientsClaim: true,
    // Every SPA navigation (deep links included) is answered with the
    // precached shell so offline reloads of any route keep working.
    navigateFallback: "index.html",
    runtimeCaching: [
      {
        urlPattern: /services\.swpc\.noaa\.gov\/(json|text|products)/,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "swpc",
          // Seven days, not one hour: Workbox ExpirationPlugin refuses to
          // serve entries older than maxAgeSeconds, and the offline promise
          // is that the last fetched products survive an offline stretch.
          expiration: { maxEntries: 50, maxAgeSeconds: 604800 },
        },
      },
      {
        urlPattern: /services\.swpc\.noaa\.gov\/images\/animations\/ovation/,
        handler: "CacheFirst",
        options: {
          cacheName: "ovation-jpg",
          expiration: { maxEntries: 30, maxAgeSeconds: 604800 },
        },
      },
      {
        // Country flags (flagcdn) never change per size: CacheFirst keeps
        // the place pill, daily forecast and webcam rows intact offline.
        urlPattern: /flagcdn\.com/,
        handler: "CacheFirst",
        options: {
          cacheName: "flags",
          expiration: { maxEntries: 60, maxAgeSeconds: 604800 },
        },
      },
    ],
  },
} satisfies Partial<VitePWAOptions>;

export default defineConfig({
  plugins: [react(), VitePWA(PWA_OPTIONS)],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.js"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});