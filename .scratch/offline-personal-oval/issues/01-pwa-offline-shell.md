# 01: PWA offline shell + honest stale

**What to build:** After one online visit the app opens offline. The shell precache plus last NOAA JSON and map tiles are cached; offline opens show stale data with honest `As of` plus `⚠ Showing saved data — couldn't reach NOAA` on every live card, or a plain error when never cached.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `vite.config.ts` uses `vite-plugin-pwa` `generateSW` `registerType:'autoUpdate'` with `skipWaiting` + `clientsClaim`, `globPatterns` for shell, `runtimeCaching` `StaleWhileRevalidate` for `services.swpc.noaa.gov` (50 entries, 3600s) + `CacheFirst` for `tiles.stadiamaps.com` (20 entries, 7 days) + `CacheFirst` for OVATION JPGs
- [ ] `manifest.json` stays `display:standalone` with existing icons, `includeAssets` covers `favicon.ico` + `assets/*`
- [ ] Offline UI on every live card: `As of {Forecast Time} • Updated {age}` plus `⚠ Showing saved data — couldn't reach NOAA` when `isError && data` (mirrors stale branch), plain `Couldn't load — connect to refresh` when never cached, `aria-live="polite"` on the `⚠`
- [ ] Build check: `vite build` emits `sw.js` + `workbox-*.js`; Playwright offline journey `load / online → go offline → reload → assert h1 + As of + ⚠` passes, and fresh-offline with empty cache shows plain error
- [ ] Honest copy for first-visit-must-be-online and iOS 7-day eviction documented in explainer/footer
