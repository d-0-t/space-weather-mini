# Offline PWA + Personal Oval (view distance band + color-blind safe canvas)

Status: ready-for-agent

## Problem Statement

Aurora chasers open the app on a hill with no signal and get nothing — the shell does not load without internet. When online, the app tells them a storm exists globally (Kp index, NOAA scale, Bz GSM, hemispheric power) and shows a static OVATION `latest.jpg`, but it cannot answer *can I see it from my town tonight, through these clouds* . The `Where am I vs oval` distance was intentionally not shipped as a single `240 km` number because it would be a guess from Kp alone. Competing apps show a picture; none honestly fuses the OVATION gridded forecast with the user's place and explains that each colored cell is a 30-minute forecast, not a live photo. Color alone on the oval fails chasers with color blindness, and a single number invites blame for a wasted drive.

## Solution

Make the app open offline after one online visit and make Home answer `can I see it from here`.

*   **Offline (PWA)**: the shell (HTML/JS/CSS) plus last NOAA JSON and map tiles are cached by a build-time Service Worker. Offline opens show `As of {Forecast Time} • Updated {age} • ⚠ Showing saved data — couldn't reach NOAA` with the last cached forecast; if never cached they show a plain error. First visit must be online; honest iOS 7-day eviction copy is shown.

*   **One place for the whole app**: Home’s new `Aurora ~band from [shortName] (i) • Update location` line and `/conditions` share the same stored `geocoded place`. Both open the same `PlaceFinder` modal (search on Enter, five Nominatim matches, Nominatim attribution, `Find my location` single-shot device location reverse-geocoded via Nominatim, `±{accuracy}m` warning). Changing the place in either place updates both. `/conditions` is simplified from a large section to the same `icon+shortName` button + modal (icon-only + `sr-only` on narrow).

*   **Personal oval**: a `<canvas>` oval on Home painting `ovation_aurora_latest.json` (1° grid, `Forecast Time` 30–90 min ahead) over a few Stadia `alidade_smooth_dark` tiles locked to world zoom 1–2 (2–4 tiles, North | South toggle, no geocoding/routing, attribution `© Stadia Maps © OpenMapTiles © OpenStreetMap`, `CacheFirst` 7 days). `Aurora 0` is transparent. Starting bands `1-5 faint / 6-10 moderate / 11-15 strong / 16+ intense` (calibrated live; quiet max `25`, storm higher) map to the frozen Kp palette in default mode. Default shows color wash only (clean). Color-blind mode (toggle `Color-blind mode`, `aria-pressed`, persists `sw:oval:cb:v1`) remaps the same bands to a color-blind safe ramp (Okabe-Ito/viridis) plus alternating hatch (`\` vs `/` vs `X`, neighbours never share) and thin white contour per band edge via `OffscreenCanvas` pattern. Legend shows swatch + hatch + line style; canvas `role="img"` `aria-label` lists bands; hidden `<table>` is source of truth; hover/tap tooltip `Aurora 14 ~ Kp 6` optional. Each painted cell carries the explainer `Forecast, not a photo. 0 = no color. Cloud/moon/town lights can still hide it.`

*   **View distance**: band from the stored place to the nearest cell `Aurora ≥6` within 600 km (haversine): `Overhead / Nearby ~0-100 km • Likely / Distant ~100-300 km • Possible / Far ~300-600 km • Unlikely / Not in range` with confidence. `(i)` popup repeats the simple non-technical copy: which intensity threshold, that distance is banded not single-number, and that it covers the `Forecast Time`. Threshold versioned for migration.

## User Stories

1. As a chaser on the hill with no signal, I want the app to open offline after one online visit, so that I am not blind.
2. As a chaser offline, I want to see `As of` plus `Updated X ago` plus `⚠ Showing saved data — couldn't reach NOAA` on every live card, so that I know how stale the forecast is.
3. As a first-time visitor offline with no cache, I want a plain honest error `Couldn't load — connect to refresh` instead of stale data, so that I am not misled.
4. As a chaser, I want the same town I pick on Home to be the town on `/conditions` (and vice versa), so that I don't pick twice.
5. As a chaser, I want Home to show `Aurora ~band from [shortName] (i)` right inside `AuroraNow` under the images, so that the personal answer lives where the storm is explained.
6. As a chaser, I want the `(i)` next to the band to explain in simple words what a colored square means (30-min forecast, `0` = no color, `1` faint → `16+` bright) and what `~240 km` means (nearest square `≥6` within 600 km, band not single number), so that I understand it is not a live camera.
7. As a chaser, I want the `Update location` button to open a modal that reuses the same place search I already know from `/conditions` (type town → Enter → pick up to five matches → or `Find my location`), so that I have one mental model.
8. As a chaser who denies location permission, I want the modal to still let me type a town and save it, so that the oval still works.
9. As a privacy-minded chaser, I want device location to be a one-shot that only becomes the stored place after I confirm it, so that my position never leaves the device unnecessarily.
10. As a chaser on `/conditions`, I want the old large place section replaced by the same `icon+shortName` button + modal as Home (with `±accuracy` hint), so that the UI is simpler and consistent.
11. As a chaser, I want an oval map on Home that paints the real OVATION grid for `Forecast Time`, not a fake ring from Kp, so that the shape is honest.
12. As a chaser, I want `0` cells to be transparent (no colour) so the map is not washed out, since `0` is `~70%` of Earth today.
13. As a chaser, I want the four bands `1-5 faint / 6-10 moderate / 11-15 strong / 16+ intense` to share the frozen Kp colours in default mode, so that the legend is one palette.
14. As a chaser, I want a `North | South` toggle for the oval (OVATION has separate north/south payloads), so that both hemispheres are viewable without infinite panning.
15. As a chaser, I want the map locked to world zoom 1–2 with Stadia dark tiles (few tiles, no geocoding/routing) so that tile cost stays near zero and the map stays readable at night.
16. As a chaser with color blindness, I want a `Color-blind mode` toggle that remaps the same bands to a safe palette and adds alternating hatch (`\` vs `/` vs `X`, neighbours never share) plus contour per band, so that I can distinguish bands even in greyscale.
17. As a chaser who prefers the pretty default, I want default to stay colour wash only with no hatch (clean), so that the image is not polluted.
18. As a keyboard/screen-reader user, I want the canvas to have `role="img"` plus `aria-label` listing the bands and a hidden table with the same per-band counts, plus focus on the toggle visible in Light Lime, so that WCAG 2.1 AA holds.
19. As a chaser, I want the map legend to show swatch + hatch square + line style per band, so that I can decode it without numbers on the map.
20. As a chaser, I want an optional tap/hover tooltip `Aurora 14 ~ Kp 6` on the map for precision, so that I can check a spot without clutter.
21. As a chaser, I want `Forecast Time` (not `Observation Time`) plus `30–90 min lead` noted near the oval, so that I don't chase a stale nowcast.
22. As a chaser with low cloud, I want the band explainer to remind me `Cloud/moon/town lights can still hide it` even when the band says `Likely`, so that I am not blamed for a wasted drive.
23. As a returning visitor, I want `Color-blind mode` and my `geocoded place` to persist in `localStorage` (`sw:oval:cb:v1` + `sw:local-conditions:place:v1`), so that I don't reconfigure.
24. As a developer, I want live OVATION and place separation to stay testable as pure `string → Product` parsers and pure distance helpers, so that data is chartable and not `any`.

## Implementation Decisions

- **PWA**: add `vite-plugin-pwa` to the Vite config with `strategies:'generateSW'`, `registerType:'autoUpdate'`, `workbox.globPatterns` for shell, `runtimeCaching` `StaleWhileRevalidate` for `services.swpc.noaa.gov` (50 entries, 3600s) + `CacheFirst` for Stadia tiles (20 entries, 7 days) + `CacheFirst` for OVATION JPGs, `skipWaiting` + `clientsClaim` for iOS, `manifest.json` stays `display:standalone` with existing icons. First visit must be online; offline honesty copy as above; text products stay fetch-on-mount only per ADR-0003.
- **Shared place**: refactor `PlaceFinder` into a modal component imported by both `AuroraNow` and `Conditions`; single storage key `sw:local-conditions:place:v1` (versioned) default `Östersund, Sweden` when empty; `device location` single-shot `getCurrentPosition({enableHighAccuracy:true, timeout:8000, maximumAge:60000})` + Nominatim reverse, `±{Math.round(accuracy)}m` warning `>200m`. Nominatim queried only on Enter, up to five matches, 1/s cap respected, attribution `© OpenStreetMap contributors` shown, debounced by model not keystroke per ADR-0005.
- **OVATION canvas**: fetch `ovation_aurora_latest.json` via TanStack Query `live:true` `refetchInterval` 5 min, `refetchIntervalInBackground:false`, stale 60s; decimate 1° grid, equirectangular projection to `<canvas>` over Stadia tiles; `type === "FeatureCollection"` / `coordinates` validated, throw format-changed error if shape changes; `Forecast Time` displayed with `Observation Time` as `As of`; hemispheric power GW headline stays. Stadia style `alidade_smooth_dark`, locked `minZoom 1` / `maxZoom 2`, horizontal wrap allowed, attribution required. North/South toggle drives which `Forecast Time` grid is painted; south uses same band thresholds.
- **Bands + palette**: `Aurora 0` transparent; `1-5/6-10/11-15/16+` map to Kp tokens via `color-mix` (no new hex) in default; color-blind mode remaps same thresholds to Okabe-Ito safe ramp. Hatch via `OffscreenCanvas` 16×16 `CanvasPattern` at low opacity, neighbours never share type, plus thin white contour per threshold in color-blind mode only. Toggle is a button `aria-pressed` with `Light Lime` focus per ADR-0002. Legend is a small key row, not numbers on map.
- **View distance**: pure helper `distanceToNearestAurora(placeLatLon, grid, threshold=6, maxKm=600)` haversine to nearest cell `Aurora ≥ threshold`; returns band enum + distancekm + confidence; table mapping per spec; `(i)` is a `GlossaryTerm`-style popup with the plain copy. Threshold stored versioned `sw:view-distance:threshold:v1`.
- **Explainability**: provenance link `https://www.swpc.noaa.gov/products/aurora-30-minute-forecast` (Newell 2009) in the explainer page and in the `(i)` footnote; glossary terms `View distance`, `Oval`, `Color-blind mode`, `Offline (PWA)` per CONTEXT.md.
- **Styling**: SCSS + BEM, color tokens only for non-data chrome, frozen Kp tokens for oval, `color-mix` greys; no raw `rgb` outside data.

## Testing Decisions

- **What makes a good test**: assert external behavior only — feed raw NOAA fixture JSON/text or synthetic OVATION grid, assert typed product or rendered landmarks/content, not helpers or component internals. No snapshots of parser output. Axe audit per page via Playwright as established.
- **Primary seams — ranked highest**:
  1. **Parser seam `string → Product`**: OVATION parser unit with fixture `ovation_aurora_latest.json` (checked-in live sample 65k cells, `max 25`, `Tromsø 14` etc.) plus edge fixtures: empty, all `0`, single cell `25`, storm `max 50` synthetic, malformed `Data Format`. Vitest per `27-day-outlook.test.ts` pattern.
  2. **View distance helper seam**: pure `distanceToNearestAurora` unit with synthetic grids (cell at known lat/lon, threshold `6`, max `600`), asserts band + distance, transparent `0` ignored, `600+` returns `Not in range`.
  3. **Canvas seam**: `AuroraNow` + oval component test — mocks Stadia tiles, asserts canvas `role="img"` `aria-label` lists bands, hidden table present, legend swatches present, toggle `aria-pressed` flips hatch class and persists `localStorage`, no hatch in default. No pixel snapshot.
  4. **Shared place modal seam**: `PlaceFinder` modal component test — renders `icon+shortName` button, opens modal on click, Enter triggers Nominatim fetch (mocked at URL boundary), shows up to five matches, `Find my location` mocks `navigator.geolocation` success/deny/absence and `±m` text, writes `sw:local-conditions:place:v1` and is readable from both Home and Conditions.
  5. **PWA seam**: build-time check that `vite.config.ts` includes `VitePWA` with expected `runtimeCaching` URL patterns, plus Playwright offline journey: load `/` online → go offline → reload → assert shell still renders `h1` + `As of` + `⚠ Showing saved data` (or plain error when cache empty). Axe audit offline.
  6. **Navigation seam**: existing `Nav.test.tsx` still asserts disclosure + `Details` label; extend for new `PlaceFinder` modal focus trap.
- **Prior art reused**: `src/products/27-day-outlook.test.ts` fixture-pin, `src/components/app-shell.test.tsx` landmark assertions, `e2e/` Playwright axe per page, `src/components/pages/conditions/conditions.test.tsx` Nominatim mock helpers.

## Out of Scope

- 24h OVATION timelapse scrubber (`products/animations/ovation_north_24h.json`) and Enlil movie — next slice after oval.
- Wake Lock keep-screen-on, Web Share, Vibration haptics — field polish slice after oval.
- Dst/GOES magnetometer detailed stackplots beyond the banner sparklines already in Horizon 1, GOES X-ray/electron series, WSA-Enlil full series.
- Push API + VAPID + endpoint DB (violates ADR-0001, needs backend) and Periodic Background Sync (0% iOS).
- Invented Bortle number or VIIRS raster tile host for light pollution (stays link-out per ADR-0005).
- Light theme (dark-only per ADR-0002) and community photo/webcam hosting.

## Further Notes

- **Live calibration**: `1-5/6-10/11-15/16+` are starting bands from `2026-09-03` quiet sample (`max 25`, `P95 10`). Re-verify against a storm sample (`max 50+`) before freeze; thresholds versioned so migration is trivial.
- **CORS + tile budget**: `services.swpc.noaa.gov` `CORS:*` `max-age=60` verified live `2026-09-03`; Stadia `alidade_smooth_dark` at zoom 1–2 is ~4 tiles north + 4 south cached 7 days, well within Stadia free; no geocoding/routing calls from map.
- **Honest freshness**: every live card keeps `Issued (UTC) • Issued (local) • Updated {age}` per ADR-0001/0003; offline `⚠` is `aria-live="polite"`; `Forecast Time` vs `Observation Time` handled per `docs/research/aurora-chaser-features-2026-08-25.md:42`.
- **Vocabulary**: use `CONTEXT.md` `Kp index`, `Dst index`, `Hemispheric power`, `Bz (GSM)`, new `View distance` (band, not single number), `Oval`, `Color-blind mode`, `Offline (PWA)`, `Geocoded place` / `Device location` exactly.
- **Sequencing**: PR1 = PWA + shared place modal (no canvas); PR2 = OVATION canvas + view distance band + color-blind mode + legend + explainers. Keeps PRs axe-green per coding standards.
