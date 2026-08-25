# Aurora Chaser Features Research — Space Weather Mini

**Date:** 2026-08-25
**Audience:** Aurora chasers (field use, mobile, dark sky, low signal)
**Constraint:** Stay client-side only per ADR-0001 — static SPA on Netlify/gh-pages, direct `fetch` from `services.swpc.noaa.gov` (CORS `*`), preferences in `localStorage`. No backend. Features needing a server are flagged and deferred.
**Scope:** Broad sweep — data sources + user-facing features + visualizations + tech/platform — filtered for aurora relevance.

> Research against primary sources only: NOAA SWPC directory listings and `services.swpc.noaa.gov` live endpoints (verified 2026-08-25), competitor sites (SpaceWeatherLive, My Aurora Forecast, AuroraWatch UK, Soft Serve / Aurora Alerts, NOAA Aurora Dashboard), and web platform specs (MDN, W3C/WICG, web.dev, caniuse). Each claim cites its owner.

---

## Executive Summary

For aurora chasers, the current app (6 text products + OVATION `latest.jpg` per `README.md:34` and `src/products/*.ts`) tells you *what NOAA said* but not *can I see it from here, tonight, through these clouds*. Three horizons emerge:

**Horizon 1 — Quick wins (1–3 days each, no new infrastructure):** 7 CORS-verified JSON endpoints already available on `services.swpc.noaa.gov` give you a real-time aurora dashboard with zero backend: planetary K-index observed+forecast, NOAA Scales (current R/S/G pill), Alerts JSON threshold polling, Bz/solar-wind summary, hemispheric power, and OVATION timelapse manifests. All return `Access-Control-Allow-Origin: *` and `Cache-Control: max-age=60` verified 2026-08-25 [NOAA track §1].

**Horizon 2 — Differentiator (2–5 days, canvas + math):** Fuse OVATION gridded JSON (`ovation_aurora_latest.json` ~900 KB, 1° grid) with client-side Geolocation + horizon geometry + cloud/moon/darkness into one *personal go/no-go* view. No competitor does this without a server [Competitor track §3]. NOAA's own viewline is experimental, N-America-only, forecast-Kp-driven, and was *removed May 2026* [https://www.swpc.noaa.gov/products/aurora-viewline-tonight-and-tomorrow-night-experimental] — a gap to own.

**Horizon 3 — Field robustness (1 day + PWA wiring):** Make it work on the hill: PWA Service Worker `StaleWhileRevalidate` for SWPC JSON/PNG, `localStorage`→`IndexedDB` split, Geolocation single-shot, Wake Lock to keep screen on gloved, Web Share + foreground-only Notifications with honest iOS caveats. Push API and Periodic Background Sync are deferred — they either need a backend or are 0% on iOS [Platform track §2].

If the app ships Horizon 1 + Horizon 3 first, it becomes the most explainable, accessible, offline-tolerant OVATION viewer with no ops cost — the exact wedge competitors leave open.

---

## 1. NOAA SWPC — What's Already There and What's Unused

### 1.1 Current usage (baseline)

- `text/discussion.txt`, `text/3-day-forecast.txt`, `text/weekly.txt`, `text/27-day-outlook.txt`, `text/daily-geomagnetic-indices.txt`, `text/wwv.txt` (geophysical alert) + `images/animations/ovation/north|south/latest.jpg` — confirmed in `README.md:34`, `src/products/*.ts` (7 product parsers), and `src/components/visualtabs/Auroras.jsx:11,16`.

### 1.2 How we verified client-side fetchability

Live crawl 2026-08-25 of `https://services.swpc.noaa.gov/`, `https://services.swpc.noaa.gov/json/`, `https://services.swpc.noaa.gov/products/`, `https://services.swpc.noaa.gov/text/`, `https://services.swpc.noaa.gov/images/` and subdirs `json/goes/primary/`, `json/rtsw/`, `products/animations/`, `products/summary/`, `products/geospace/`. For every candidate below, `curl -I` returned `Access-Control-Allow-Origin: *`, `Cache-Control: max-age=60`, CloudFront — e.g. `json/ovation_aurora_latest.json`, `products/alerts.json`, `products/noaa-planetary-k-index.json`, `json/rtsw/rtsw_mag_1m.json`, `text/aurora-nowcast-hemi-power.txt` [NOAA track]. No auth, no proxy needed — satisfies ADR-0001.

Docs cross-checked against `https://www.swpc.noaa.gov/products-and-data` and `https://www.swpc.noaa.gov/products/aurora-30-minute-forecast` (which calls out "latest JSON file", "30 to 90 minute forecast…OVATION model…linear relationship to intensity") [same].

### 1.3 Unused but CORS-enabled catalog (aurora-highlighted)

| Product | URL | Format | Aurora relevance | Client-side | Primary source |
|---|---|---|---|---|---|
| **OVATION Aurora Latest — gridded forecast** | `https://services.swpc.noaa.gov/json/ovation_aurora_latest.json` | JSON `{Observation Time, Forecast Time, Data Format: "[Lon,Lat,Aurora]", coordinates: [[…]]}` ~900 KB, 1° grid, 30–90 min lead (L1 transit) | **CRITICAL** — per-cell probability/intensity; enables canvas/Leaflet overlay distinct from static `latest.jpg` | Yes — `CORS:*`, `CT:application/json`, `Expires+60s` verified | Dir `https://services.swpc.noaa.gov/json/`; doc `https://www.swpc.noaa.gov/products/aurora-30-minute-forecast` |
| OVATION Hemispheric Power | `https://services.swpc.noaa.gov/text/aurora-nowcast-hemi-power.txt` | TXT minute power (GW) | **High** — scalar aurora power, thresholdable | Yes `CORS:*` 11 KB | `https://services.swpc.noaa.gov/text/` + same aurora page ("latest HPI") |
| OVATION 24h timelapse manifest | `https://services.swpc.noaa.gov/products/animations/ovation_north_24h.json` (+ south) | JSON 288 frames, 5 min step → JPG URLs | **High** — movie without gridding math | Yes `CORS:*` 31 KB | `https://services.swpc.noaa.gov/products/animations/` |
| **Planetary K-index — observed (3h)** | `https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json` | JSON 61 pts / ~8 days | **CRITICAL** — Kp → G1=5…G5=9 storm scale | Yes | Doc `https://www.swpc.noaa.gov/products/planetary-k-index` ("Chart JSON…Observed Planetary K Index") + dir `products/` |
| **Planetary K — observed+forecast** | `https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json` | JSON 81 pts (~3d, 3h step) with `noaa_scale:"G1"` | **CRITICAL** — combines past+future with G badge | Yes 6.7 KB | `https://services.swpc.noaa.gov/products/` |
| Planetary K 1-min estimate | `https://services.swpc.noaa.gov/json/planetary_k_index_1m.json` | JSON 358 pts /6h, 1 min | **High** — nowcast between 3h samples | Yes 27 KB | `https://services.swpc.noaa.gov/json/` |
| Boulder K 1-min | `https://services.swpc.noaa.gov/json/boulder_k_index_1m.json` | JSON 1434 pts /24h | **Medium** — local magnetometer | Yes 84 KB | `https://services.swpc.noaa.gov/json/` |
| **NOAA Scales — current R/S/G + probs** | `https://services.swpc.noaa.gov/products/noaa-scales.json` | JSON `{"0":{R,S,G}, "1":{…day1}, "-1":{…yesterday}}` 1.1 KB | **High** — one-payload now + next-3d G/R/S prob | Yes | `https://services.swpc.noaa.gov/products/` |
| **Alerts / Watches / Warnings** | `https://services.swpc.noaa.gov/products/alerts.json` | JSON ~80 items, `product_id`, `message:"Space Weather Message Code: SUMXM5…"` 48 KB | **CRITICAL** — G watches/warnings = aurora push-equivalent via polling | Yes | Doc `https://www.swpc.noaa.gov/products/alerts-watches-and-warnings` ("current …available directly from this JSON file") |
| Solar wind — summary current | `https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json` + `…/solar-wind-speed.json` + `…/10cm-flux.json` | JSON `<60 B` each | **High** — **Bz GSM** southward = reconnection → oval brightens 30–60 min | Yes | `https://services.swpc.noaa.gov/products/summary/` |
| Solar wind — RL 1-min (IMAP/DSCOVR) | `https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json` + `…/rtsw_wind_1m.json` | JSON 3217/3173 rows 1.3/2.2 MB | **CRITICAL** — full B vector + density sparkline | Yes | `https://services.swpc.noaa.gov/json/rtsw/` |
| Propagated solar wind | `https://services.swpc.noaa.gov/products/geospace/propagated-solar-wind.json` | JSON 9815 rows 1.1 MB | **Medium** — L1→bow shock ETA | Yes | `https://services.swpc.noaa.gov/products/geospace/` |
| **Dst indices** | `https://services.swpc.noaa.gov/products/kyoto-dst.json` + `https://services.swpc.noaa.gov/json/geospace/geospace_dst_1_hour.json` | JSON 167/113 pts | **High** — Dst <-30 nT = main phase | Yes 6–7 KB | `products/` + `json/geospace/` |
| GOES magnetometer | `https://services.swpc.noaa.gov/json/goes/primary/magnetometers-1-day.json` (also -3-day/-6-hour/-7-day; `secondary/`) | JSON 1438 pts/day | **Medium** — geosync depression = substorm | Yes 255 KB | Doc `https://www.swpc.noaa.gov/products/goes-magnetometer` + `json/goes/primary/` |
| GOES X-ray flux | `https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json` + `xray-flares-latest.json` | JSON 657 KB + 449 B | **Medium** — X-flare→CME days later | Yes | Doc `https://www.swpc.noaa.gov/products/goes-x-ray-flux` |
| WSA-Enlil | `https://services.swpc.noaa.gov/json/enlil_time_series.json` + `https://services.swpc.noaa.gov/products/animations/enlil.json` | JSON 4349 pts 1.5 MB + manifest 12 KB | **Medium** — CME arrival pred. | Yes | Doc `https://www.swpc.noaa.gov/products/wsa-enlil-solar-wind-prediction` |
| Text extras | `https://services.swpc.noaa.gov/text/3-day-geomag-forecast.txt` + `advisory-outlook.txt` + `45-day-forecast.txt` + `daily-solar-indices.txt` + `current-space-weather-indices.txt` | TXT with `:Issued:` header (reuse `product-header.ts:62` `scanHeader`) | **Medium** — reuse existing parser | Yes | `https://services.swpc.noaa.gov/text/` |

> NetCDF and model `net/` excluded — not browser-parseable [NOAA track].

### 1.4 Top 7 ranked opportunities (impact / effort for aurora chasers)

1. **Planetary K-index observed+forecast** — impact 10/10, effort low (~1 day). Replaces manual `daily-geomagnetic-indices.txt` table, adds future with `noaa_scale`. Reuse `.kp01`–`.kp9` palette. Sources: `products/noaa-planetary-k-index.json` + `…-forecast.json` [§1.3].
2. **Alerts/Watches/Warnings** — 10/10, low (~1 day). Event-driven G watches are the only push-equivalent feasible client-side: poll 2–5 min, dedup `product_id+issue_datetime`, stash in `localStorage`, optional `Notification` API. Source: `products/alerts.json` [§1.3].
3. **NOAA Scales** — 9/10, trivial (<0.5 day). 1.1 KB pill strip: now G + 3-day prob. Source: `products/noaa-scales.json` [§1.3].
4. **OVATION JSON + Hemispheric Power** — 9/10, medium (2–3 days). Interactive oval: project `coordinates` to Canvas/Leaflet, overlay user position/viewline, map to Kp palette. Headline HPI GW next to map. Handle `Forecast Time` vs `Observation Time`, decimate 900 KB, debounce 5 min. Sources: `json/ovation_aurora_latest.json` + `text/aurora-nowcast-hemi-power.txt` [§1.3].
5. **Solar wind Bz/Bt + speed summary → full `rtsw_*_1m`** — 9/10, low→medium. Summary `<60 B` gives "Bz = -12 nT ↓ — aurora in ~1h" banner polled 1 min; graduate to 1-min sparkline + flip detection. Sources: `products/summary/solar-wind-*.json` + `json/rtsw/rtsw_mag_1m.json` [§1.3].
6. **OVATION 24h timelapse / Enlil movie** — 8/10, low (half day). Manifest-driven flipbook, no gridding. Sources: `products/animations/ovation_north_24h.json` (+ south), `products/animations/enlil.json` [§1.3].
7. **Dst + GOES magnetometer** — 7/10, low (1 day). Dst <-30 confirmation, geosync `Hp` compression. Sources: `products/kyoto-dst.json`, `json/geospace/geospace_dst_1_hour.json`, `json/goes/primary/magnetometers-1-day.json` [§1.3].

All argue for polling 60–300 s given `Cache-Control: max-age=60` [NOAA track].

---

## 2. Competitor Feature Map — What Chasers Already Get Elsewhere

### 2.1 Products checked (primary sources only)

- SpaceWeatherLive — `https://www.spaceweatherlive.com/` and subpages
- My Aurora Forecast (jRustonApps) — `https://www.jrustonapps.com/apps/my-aurora-forecast` + App Store listings
- AuroraWatch UK — `https://aurorawatch.lancs.ac.uk/` + store pages `https://mwm.ai/apps/aurorawatch-uk-aurora-alerts/946141347` / `https://apps.apple.com/gb/app/aurorawatch-uk-aurora-alerts/id946141347`
- NOAA Aurora Dashboard — `https://www.swpc.noaa.gov/products/aurora-30-minute-forecast`
- Soft Serve News / Aurora Alerts — `https://cdn.softservenews.com/Aurora.htm`, `https://aurora-alerts.com/`, `https://www.softservenews.com/members/aurora-alerts-north-america.html`

### 2.2 Matrix — feature → who has it → static-SPA feasible?

| Feature | Competitors | Static? | Citation |
|---|---|---|---|
| **Oval / OVATION nowcast (30–90 min)** | All (NOAA renders; SWL embeds JPG + HPI; MyAF OVATION map; AWUK Ovation map; Soft Serve JPG + power) | ✅ Direct `fetch` JSON + JPG | `https://www.swpc.noaa.gov/products/aurora-30-minute-forecast`; `https://www.spaceweatherlive.com/`; `https://www.jrustonapps.com/apps/my-aurora-forecast`; `https://mwm.ai/apps/aurorawatch-uk-aurora-alerts/946141347`; `https://cdn.softservenews.com/Aurora.htm` |
| **Viewline (southern horizon)** | NOAA only (experimental N-America, max Kp 18–06 CT). **Removed May 2026** | ✅ Compute client-side or static PNG `tonights_static_viewline_forecast.png` | `https://www.swpc.noaa.gov/products/aurora-viewline-tonight-and-tomorrow-night-experimental` ("1000 km away") |
| **Kp / 3-day + 27-day forecast** | All | ✅ `services.swpc.noaa.gov` JSON | `https://www.spaceweatherlive.com/en/auroral-activity/aurora-forecast.html`; `https://www.spaceweatherlive.com/`; `https://www.jrustonapps.com/apps/my-aurora-forecast`; `https://cdn.softservenews.com/Aurora.htm`; `https://www.softservenews.com/members/aurora-alerts-north-america.html` |
| **Real-time solar wind (Speed/Density/Bz/Bt)** | SWL, Soft Serve/Aurora Alerts (Bz inbound train 20–40 min), MyAF, NOAA L1 | ✅ NOAA `rtsw`/`summary` JSON | `https://www.spaceweatherlive.com/`; `https://cdn.softservenews.com/Aurora.htm`; `https://aurora-alerts.com/` |
| **Kp-threshold filters** | SWL (≥Kp, flare/R thresholds v1.7–1.8); MyAF free push; Aurora Alerts Kp/horizon; Soft Serve cloud+Ovation (e.g. *Kp 4.67 +30% cloud +42GW*); AWUK Green→Red | ⚠️ Partial — in-tab `Notification` works, background push needs server | `https://www.spaceweatherlive.com/en/aurora-alerts.html`; `https://spaceweatherlive.soft112.com/`; `https://spark.mwm.ai/en/apps/spaceweatherlive/1435501021`; `https://aurora-alerts.com/`; `https://cdn.softservenews.com/en/aurora-borealis-breaking-news/aurora-borealis-alerts-gets-new-features-300050.html`; `https://aurorawatch.lancs.ac.uk/alerts/` |
| **Push / location-based alerts** | All except NOAA; SWL app/Twitter/browser; MyAF push + best-locations; AWUK Twitter/Telegram/API/apps (max 3/6h); Soft Serve unlimited $5.95/mo | ❌ Background push needs server. ✅ Foreground polling + Geolocation | Same as above + `https://www.softservenews.com/members/aurora-alerts-north-america.html`; `https://www.jrustonapps.com/apps/my-aurora-forecast` |
| **Cloud cover overlay/filter** | SWL v1.5 cloud map + city weather; MyAF cloud map+%; AWUK UK cloud + Cliff Cam; Soft Serve max cloud + satellite US/EU; Aurora Alerts weather+cloud | ✅ `open-meteo.com` / `api.openweathermap.org` CORS (client key) | `https://spaceweatherlive.soft112.com/`; `https://apps.apple.com/us/app/my-aurora-forecast-alerts/id1073082439`; `https://mwm.ai/apps/aurorawatch-uk-aurora-alerts/946141347`; `https://cdn.softservenews.com/en/aurora-borealis-breaking-news/aurora-borealis-alerts-gets-new-features-300050.html`; `https://aurora-alerts.com/` |
| **Dark sky / light pollution + moon** | Moon only: SWL Moon Phase + illumination; Soft Serve/Aurora Alerts moon illumination + "get away from city lights"; **none has Bortle tile** | ✅ Moon via `suncalc` lib; VIIRS tiles + sun altitude client math | `https://www.spaceweatherlive.com/`; `https://cdn.softservenews.com/Aurora.htm`; `https://aurora-alerts.com/` |
| **Local horizon geometry** | Only Aurora Alerts (horizon vs overhead) + NOAA "1000 km" note; **no one computes personal azimuth/elevation** | ✅ Pure JS (OVATION grid + haversine + solar elevation) | `https://aurora-alerts.com/`; `https://www.swpc.noaa.gov/products/aurora-30-minute-forecast` |
| **Best locations ranked list** | MyAF only | ✅ Rank client-side via OVATION + cloud + user pos | `https://www.jrustonapps.com/apps/my-aurora-forecast` |
| **Magnetometers / stackplots / Dst** | SWL (GOES/Kiruna/CANMOS/Hobart); AWUK SAMNET/AuroraWatchNet LAN2 + 24h chart; NOAA GOES/Boulder | ✅ NOAA/SWL GIF/PNG | `https://www.spaceweatherlive.com/`; `https://aurorawatch.lancs.ac.uk/alerts/` |
| **Community photos/observations** | SWL observations+forum+webcams; MyAF/AWUK webcams, AWUK Flickr, Soft Serve testimonials | ❌ Upload requires backend; can aggregate CORS images | `https://www.spaceweatherlive.com/`; `https://www.spaceweatherlive.com/en/auroral-activity/aurora-forecast.html`; `https://apps.apple.com/gb/app/aurorawatch-uk-aurora-alerts/id946141347` |
| **Education / explainability** | SWL help pop-ups + FAQ; NOAA Phenomena/Tips; AWUK "What does this mean?" | ✅ Static — biggest open wedge | `https://www.spaceweatherlive.com/en/aurora-alerts.html`; link from `https://www.swpc.noaa.gov/products/aurora-30-minute-forecast` |
| **Archive / history** | SWL 1996→yesterday + Top 50 | ✅ NOAA NCEI `fetch` | `https://spark.mwm.ai/en/apps/spaceweatherlive/1435501021` |
| **Dark mode / field usability** | SWL dark mode; MyAF dark design | ✅ CSS only | `https://spark.mwm.ai/en/apps/spaceweatherlive/1435501021`; `https://www.jrustonapps.com/apps/my-aurora-forecast` |

### 2.3 Gaps where Space Weather Mini can win *without* a backend

1. **Explainability is thin everywhere.** No one explains *why* Kp 5 ≠ guarantee (Bz coupling, solar-wind speed). OVATION = Newell et al. 2009 precipitation model validated vs UVI — cited on NOAA's own page `https://www.swpc.noaa.gov/products/aurora-30-minute-forecast` — but hidden. None meets WCAG 2.1 AA (store entries: "accessibility features not indicated"). Chasers cite this as confusion.
2. **Personal horizon is unsolved.** NOAA viewline was N-America-only, Kp-driven, removed May 2026 `https://www.swpc.noaa.gov/products/aurora-viewline-tonight-and-tomorrow-night-experimental`. Aurora Alerts only binary horizon/overhead `https://aurora-alerts.com/`. Mini can own **client-side horizon**: for `navigator.geolocation` lat/lon, sample OVATION grid cells within ~1000 km (`https://www.swpc.noaa.gov/products/aurora-30-minute-forecast` "visible 1000 km away"), compute magnetic latitude, solar elevation (night check), predicted elevation angle → "low on northern horizon / overhead / below horizon".
3. **Cloud + moon + darkness fragmented.** Everyone shows cloud as separate tab; none fuses cloud + moon illumination + sun altitude + light-pollution (Bortle/VIIRS) into one go/no-go. All data CORS-fetchable client-side (Open-Meteo cloud forecast, `suncalc` moon, VIIRS tiles). Top chaser complaint on MyAF: "want cloud *prediction* map, not just now" `https://apps.apple.com/us/app/my-aurora-forecast-alerts/id1073082439`.
4. **Alerts = backend moat — flip to transparency advantage.** Every location-aware push (SWL free/paid `https://www.spaceweatherlive.com/en/aurora-alerts.html`, MyAF free `https://www.jrustonapps.com/apps/my-aurora-forecast`, AWUK free+API `https://aurorawatch.lancs.ac.uk/alerts/`, Soft Serve $5.95/mo `https://www.softservenews.com/members/aurora-alerts-north-america.html`) needs a server. Mini offers **foreground-only smart polling** while tab/PWA is open: fetch NOAA every 2 min, evaluate Kp+Ovation GW+cloud locally, fire `Notification` + sound/vibration, plus exportable ICS for 27-day peaks — zero backend, privacy-preserving (location never leaves device).
5. **Open + offline.** AWUK alone offers free API `https://aurorawatch.lancs.ac.uk/alerts/`; competitors are closed. Mini can become the offline hill app: Cache last OVATION JSON + cloud forecast in `CacheStorage`/`IndexedDB`, show `As of` + lead time ("L1→Earth 30–90 min" `https://www.swpc.noaa.gov/products/aurora-30-minute-forecast`) with stale-while-revalidate — impossible for NOAA's server-rendered dashboard.

**Don't compete on push infrastructure or photo hosting. Win on fusion: OVATION JSON + local horizon + cloud/moon/darkness, fully explainable, accessible, PWA-installable.**

---

## 3. Web Platform — What a Static SPA Can Actually Do in 2026

> All status from primary specs/docs 2026-08-25. Constraint: no backend.

### 3.1 Capability matrix

| Capability | Use for chasers | Support 2026 | iOS caveat | Offline | Needs backend? | Primary source |
|---|---|---|---|---|---|---|
| **Notifications API** (local polling, no push server) | Poll alerts/3-day every 5–15 min via `fetch`+`setInterval`, diff Kp, `SWRegistration.showNotification()` if threshold | Limited availability, **94.36%** global (80.23% full +14.13% partial) [caniuse] | **iOS 16.4+ only if added to Home Screen** (`display:standalone`). Before 16.4: `n`. EU 17.4+: standalone removed → no notification. Must use SW `showNotification` (`new Notification()` throws on mobile) | Only while tab/foreground SW alive | No | [MDN Notifications_API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API) · [MDN requestPermission](https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission_static) · [Spec](https://notifications.spec.whatwg.org/) · [caniuse notifications](https://caniuse.com/notifications) |
| **Push API** (VAPID) | Reliable alerts when closed | Baseline since Mar 2023, **95.68%** | iOS 16.4+ Home Screen only; not firing until SW `skipWaiting`+`clientsClaim` ([Discourse bug](https://meta.discourse.org/t/push-notification-subscription-in-ios-pwa-silently-failing-because-of-sw-not-controlling-the-app/402645)) | Works closed (OS wakes SW) | **YES** — VAPID keys + endpoint DB = backend | [MDN Push_API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) · [Spec](https://w3c.github.io/push-api/) · [caniuse push](https://caniuse.com/mdn-api_serviceworkerglobalscope_push_event) |
| **Geolocation API** (`getCurrentPosition`/`watchPosition`) | Distance/bearing to oval; `getCurrentPosition({enableHighAccuracy:true, timeout:8000, maximumAge:60000})` | Baseline since Jul 2015, **96.69%**, needs **HTTPS** | Prompt only on **user gesture** ([web.dev](https://web.dev/articles/user-location)); session-only permission possible; no background when suspended | GPS hardware works offline; math offline | No | [MDN Geolocation_API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) · [MDN getCurrentPosition](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition) · [Spec](https://w3c.github.io/geolocation/) · [caniuse geolocation](https://caniuse.com/geolocation) |
| **PWA — Service Worker + Cache API + Manifest** | Precache shell (React/Vite) + `StaleWhileRevalidate` for NOAA JSON + `CacheFirst` for PNGs → instant on poor signal | Chrome 40+, Safari 11.1+, Firefox 44+ ~**96%** | iOS SW since 11.3; **7-day cap** if not launched, evictable under pressure ([MDN quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)); manual Add to Home Screen | **Core offline**: shell fully offline; data stale-while-revalidate | No (build-time `vite-plugin-pwa`) | [MDN Caching](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching) · [web.dev service-workers](https://web.dev/learn/pwa/service-workers) · [MDN Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache) · [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) |
| **Periodic Background Sync / Background Sync / Background Fetch** | Refresh in background before hill | **Limited · Experimental** Chrome/Edge 80+ Android only. **0% iOS** | Not supported on any iOS. Chrome needs installed PWA + engagement, **12 h min** interval via `PeriodicSyncManager` | Would help, but unusable for iOS aurora audience | No (client), but not viable | [MDN Periodic Sync](https://developer.mozilla.org/en-US/docs/Web/API/Web_Periodic_Background_Synchronization_API) · [WICG spec](https://wicg.github.io/periodic-background-sync/) · [Chrome docs](https://developer.chrome.com/docs/capabilities/periodic-background-sync) |
| **Storage: `localStorage` vs `IndexedDB`** | `localStorage` = theme/thresholds/banners; `IndexedDB` = 30-day history + cached products | `localStorage` ~**5 MiB** sync string-only; `IndexedDB` **up to 60% disk** (~8 TiB), async/Blob | WebKit may evict best-effort; `navigator.storage.persist()` not honored uniformly | Both persist offline; SW can read `IndexedDB`/`Cache`, not `localStorage` | No | [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) · [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) · [MDN quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) · [caniuse IndexedDB](https://caniuse.com/mdn-api_indexeddb) |
| **Web Share API** (`navigator.share`/`canShare`) | Share "Kp 7 — viewline 120 km" URL/text/image | Limited, needs **secure context + transient activation** (button tap) | Desktop Safari 12.1+ text/URL only; file share iOS 15+ / Chrome Android. Validate `canShare()` | Works offline (OS targets) | No | [MDN navigator.share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) · [MDN Web Share](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API) · [caniuse web-share](https://caniuse.com/web-share) · [Spec](https://w3c.github.io/web-share/) |
| **Canvas 2D / WebGL / OffscreenCanvas** | Composite polar OVATION PNG onto equirectangular map, interpolate viewline | Canvas Baseline Jul 2015; OffscreenCanvas Baseline Mar 2023 | OffscreenCanvas in workers since iOS 16.4 | Fully offline if images precached | No | [MDN Canvas_API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) · [MDN OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) |
| **Screen Wake Lock** | Keep screen on gloved in cold | Baseline 2025 Newly available Mar 2025, **94.24%** (`Chrome 85+`, `Safari 16.4+`, `Firefox 126+`) | iOS 16.4+ supported ([caniuse wake-lock](https://caniuse.com/wake-lock)); auto-released on `visibilitychange`/lock | Foreground only | No | [MDN Screen Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API) · [W3C spec](https://w3c.github.io/screen-wake-lock/) · [caniuse wake-lock](https://caniuse.com/wake-lock) |
| **Vibration API** (`navigator.vibrate`) | Haptic buzz on threshold when phone in pocket | Limited, not Baseline; **No iOS/desktop** | **iOS: not supported** ([caniuse vibration](https://caniuse.com/vibration)); Android Chrome/FF only; needs sticky activation, respects Silent/DND | Foreground only | No | [MDN vibrate](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate) · [caniuse vibration](https://caniuse.com/vibration) · [Spec](https://w3c.github.io/vibration/) |

> `prefers-color-scheme` already handled [Platform track].

### 3.2 Ranked recommendations for static SPA (most ROI first)

1. **PWA shell + data caching (Vite PWA)** — highest ROI for field. `VitePWA({ strategies:'generateSW', workbox:{ globPatterns:['**/*.{js,css,html,woff2}'], runtimeCaching:[{urlPattern:/services\.swpc\.noaa\.gov/, handler:'StaleWhileRevalidate', options:{cacheName:'swpc', expiration:{maxEntries:50, maxAgeSeconds:3600}}}]}, manifest:{display:'standalone'} })` on Netlify/gh-pages static. Offline shell + fresh data without backend. Add `skipWaiting`+`clientsClaim` for iOS race.
2. **Geolocation + viewline distance** — single-shot button "Where am I vs oval?" with permission nudge, haversine math client-side; fallback manual lat/lon; display `coords.accuracy` ±10–50 m warning.
3. **Wake Lock opt-in toggle** — "Keep screen on". `await navigator.wakeLock.request('screen')` + `visibilitychange` re-acquire + release on toggle off; explain battery cost.
4. **Storage split** — keep prefs in `localStorage` (<5 KiB); add `IndexedDB` via `idb` wrapper for 30-day history if charting; call `navigator.storage.persist()` on first save; handle `QuotaExceededError`.
5. **Canvas/WebGL OVATION overlay** — fetch OVATION PNGs, draw to `<canvas>` with map projection; precache via Cache API; offload to `OffscreenCanvas` worker if needed.
6. **Web Share** — `if(navigator.canShare({url,text})) await navigator.share({title:'Aurora — Kp 6',text,url})` else `clipboard.writeText` fallback.
7. **Local Notifications (foreground only)** — polling + `showNotification()` as degraded enhancement with honest UX: "Alerts while app open". Requires `Notification.requestPermission()` on tap; document iOS Home-Screen prerequisite; never promise background.
8. **Vibration** — `navigator.vibrate?.(200)` on alert, gated on `canVibrate` + user gesture; Android-only, low priority.

**Defer without backend:** Push API (needs VAPID + endpoint DB — ADR-0001 says "backend is added at that point" if decision-critical) and Periodic Background Sync (0% iOS, so not viable for field audience) [Platform track, ADR-0001].

---

## 4. Synthesized Backlog — Recommended Features for Aurora Chasers (Client-Side Only)

Ranked by aurora-chaser value vs. static-SPA effort. Effort estimates assume existing `string → Product` parsers and TanStack Query keys per URL (ADR-0001).

### Immediate (ship first — 2–4 weeks solo)

| # | Feature | What to build | Data | Effort | Impact | ADR / caveat |
|---|---|---|---|---|---|---|
| 1 | **Live Kp dashboard** (observed + forecast + nowcast) | One card: current `noaa_scale` pill (G0–G5) + 8-day 3h Kp bar chart (Recharts) + 3-day forecast strip + 1-min estimate sparkline. Reuse `.kp01`–`.kp9` tokens frozen per ADR-0002. | `noaa-planetary-k-index.json` + `…-forecast.json` (+ `planetary_k_index_1m.json` later) — 5–27 KB | S (1–2 d) | **10** | Poll 5 min; "As of" timestamp required (ADR-0001 consequence) |
| 2 | **Now panel (R/S/G scales)** | Tiny pill row from single 1.1 KB payload: now `G:{Scale,Text}` + Day1–3 probs. Becomes header summary. | `noaa-scales.json` | XS (<0.5 d) | 9 | Trivial; cache 1h |
| 3 | **Foreground aurora alerts** | Poll `alerts.json` 2–5 min, filter `G`/`WATCH`/`WARNING`, dedup `product_id+issue_datetime` in `localStorage`, show in-app banner; if `Notification.permission==="granted"` also `showNotification()`. Sound toggle (Web Audio, needs gesture). Honest empty state: "Keep app open for live alerts." | `products/alerts.json` 48 KB | S (1 d) | **10** | Foreground only per §3.1; iOS needs Home Screen PWA (§3) |
| 4 | **Bz south + solar wind banner** | "Bz -12 nT south — oval may brighten in 30–60 min" from summary `<60 B` poll 1 min; detail sheet with 1-min `rtsw_mag_1m`/`rtsw_wind_1m` sparkline when expanded. Explain Bz coupling inline (link NOAA OVATION page). | `products/summary/solar-wind-mag-field.json` + `…speed.json` → `json/rtsw/rtsw_mag_1m.json` | S (0.5–2 d) | 9 | Summary first (tiny), full series later (1.3 MB — window to 6h) |
| 5 | **PWA installability + offline cache** | `vite-plugin-pwa` `generateSW` with `StaleWhileRevalidate` for `services.swpc.noaa.gov`, `CacheFirst` for OVATION JPGs; manifest `display:standalone`; "As of" + "Updated X ago" everywhere. | Build-time only | S (1 d) | 9 field | Requires `skipWaiting`+`clientsClaim` for iOS; storage 7-day cap if not launched (§3.1) |
| 6 | **"Where am I vs oval?" button** | Single-shot Geolocation (`enableHighAccuracy:true`), haversine to nearest OVATION threshold, display distance + accuracy ±m, fallback manual lat/lon input. No map yet — just distance pill. | Geolocation API (§3) + Hemispheric Power or threshold from OVATION JSON if available | XS (0.5 d) | 8 | Needs user gesture; explain permission; HTTPS only (§3) |

### Next (differentiator — 1–2 weeks each)

| # | Feature | What to build | Data | Effort | Impact |
|---|---|---|---|---|---|
| 7 | **Interactive OVATION oval (canvas)** | Fetch `ovation_aurora_latest.json` (900 KB), decimate grid, project to Equirectangular Canvas/Leaflet, Color-map to Kp palette, overlay user dot + 1000 km viewline ring, headline hemispheric power GW, handle `Observation` vs `Forecast Time` (30–90 min lead `https://www.swpc.noaa.gov/products/aurora-30-minute-forecast`). | `ovation_aurora_latest.json` + `aurora-nowcast-hemi-power.txt` | M (2–3 d) | 9 — **unique** (§2.3) |
| 8 | **Personal horizon / elevation forecast** | From user's lat/lon + OVATION grid, compute visible elevation/azimuth, solar elevation (night check via `suncalc`), magnetic latitude, output "Low N horizon / Overhead / Below horizon" + confidence. No server: pure haversine + magnetic coord math. | OVATION JSON + `suncalc` + Geolocation (§3) | M (2 d) | 9 — NOAA viewline replacement (§2) |
| 9 | **Cloud + moon + darkness fusion (go/no-go)** | One score: Open-Meteo cloud forecast (next 12–48h) + `suncalc` moon illumination/altitude + sun altitude + VIIRS light-pollution tile overlay. Show "Cloud 80% — wait for break at 02:00" not just "clear now". | Open-Meteo CORS + `suncalc` + VIIRS tiles (§2.3, §3) | M (2–3 d) | **10 for chasers** — addresses MyAF review gap `https://apps.apple.com/us/app/my-aurora-forecast-alerts/id1073082439` |
| 10 | **24h oval timelapse scrubber** | Iterate `ovation_north_24h.json` 288 URLs into `<img>` flip / `requestAnimationFrame` strip with time slider. Same for Enlil CME movie as explainer. | `products/animations/ovation_north_24h.json` + `images/animations/ovation/north/` | S (0.5 d) | 8 |
| 11 | **Dst / GOES magnetometer confirmation panel** | 24h Dst <-30 nT flag + GOES `Hp` compression chart as "storm confirmation" companion to Kp. | `products/kyoto-dst.json` + `json/geospace/geospace_dst_1_hour.json` + `json/goes/primary/magnetometers-1-day.json` | S (1 d) | 7 |
| 12 | **Wake Lock + Share + Vibration polish** | Toggle "Keep screen on" (§3) + Web Share `Kp 6 overhead — 45 km away` + Android haptic buzz on alert (§3 #7–8). | Wake Lock / Web Share / Vibration APIs (§3) | XS (0.5 d) | 6 field polish |
| 13 | **Explainability pass (WCAG AA + provenance)** | Inline glossary links (`Kp index`, `hemispheric power`, `Bz GSM`) with NOAA provenance (e.g. "OVATION Newell 2009 validated vs UVI" `https://www.swpc.noaa.gov/products/aurora-30-minute-forecast` + doi:10.1029/2011SW000746), `aria-label` for oval intensity, focus Light Lime (§ ADR-0002), add `product-header.ts` reuse for `3-day-geomag-forecast.txt` + `advisory-outlook.txt`. | Existing `explainers/` + new text products `text/3-day-geomag-forecast.txt` etc. (§1.3) | S (1 d) | 8 — unclaimed (§2.3) |

### Deferred (needs backend — flag for future ADR)

- True background push alerts when app closed (Push API + VAPID + endpoint DB) — asked for by every competitor's paid tier `https://www.softservenews.com/members/aurora-alerts-north-america.html` vs `https://www.spaceweatherlive.com/en/aurora-alerts.html` but explicitly deferred by ADR-0001 "no user accounts; alerting beyond browser locally is out of scope" and Platform §3.2.
- Community observations / photo upload / webcam aggregation with user storage.
- Periodic Background Sync auto-refresh (0% iOS, 12 h clamp even on Chrome) — not viable for hill use (§3.1).
- NetCDF solar-wind models that need server-side parse.

### Suggested sequencing (avoids rework)

```
Week 1: #2 Scales pill + #1 Kp dashboard + #6 Geolocation button + #5 PWA
Week 2: #4 Bz banner + #3 Alerts polling (+ Notification permission UX)
Week 3: #7 OVATION canvas (decimated grid) + #13 explainability
Week 4: #8 personal horizon math + #9 cloud/moon/darkness fusion MVP
Week 5: #10 timelapse + #11 Dst/GOES + #12 field polish
```

Each slice reuses the same TanStack Query key-per-URL data layer so a future backend (per ADR-0001 "data layer is the only thing that changes") is a drop-in.

---

## 5. Risks & Constraints to Carry Forward

- **iOS field reality:** Notifications and Wake Lock both need iOS 16.4+ Home Screen PWA (and EU 17.4+ removed standalone) [§3.1]. PWA storage evictable if not launched in 7 days [MDN quotas]. Never promise "you'll be woken at 3am" without a backend — honest copy is the product choice.
- **Polling cost:** SWPC `max-age=60` means 1-min poll is generous but 20–40 min is the physical Bz→oval lead time `https://cdn.softservenews.com/Aurora.htm` ("inbound train 20-40 min"). No need for 5 s polling; 60–300 s respects cache and battery.
- **OVATION JSON size:** 900 KB every 5 min on poor signal needs decimation + `requestIdleCallback` parse + Cache `StaleWhileRevalidate`; show `Forecast Time` not `Observation Time` or chasers chase stale [§1.3 doc].
- **CORS assumption:** Verified 2026-08-25 for JSON/TXT/JPG; if SWPC moves to auth or non-CORS model, ADR-0001 fallback is a proxy ADR — flagged in `0001-client-side-only-architecture.md:13`.
- **A11y + night vision:** Keep dark-only theme per ADR-0002; Light Lime focus 13:1 on black already passes WCAG AA — don't add light theme for this audience.

---

## 6. How to Turn This Into Issues

Per `docs/agents/issue-tracker.md`, create ` .scratch/<feature-slug>/` with `Status:` labels (`needs-triage`→`ready-for-agent` etc.) See `docs/agents/triage-labels.md` for the five roles. Suggested slugs matching the backlog above: `aurora-kp-dashboard`, `aurora-now-scales`, `aurora-alerts-foreground`, `aurora-bz-banner`, `aurora-pwa-offline`, `aurora-where-am-i`, `aurora-ovation-canvas`, `aurora-personal-horizon`, `aurora-cloud-moon-fusion`, `aurora-timelapse`, `aurora-dst-goes`, `aurora-field-polish`, `aurora-explainability`.

---

## Appendix: Sources Audited for This Report

### NOAA SWPC (verified live 2026-08-25)
- Directory listings: `https://services.swpc.noaa.gov/`, `https://services.swpc.noaa.gov/json/`, `https://services.swpc.noaa.gov/products/`, `https://services.swpc.noaa.gov/text/`, `https://services.swpc.noaa.gov/images/`, `https://services.swpc.noaa.gov/json/goes/primary/`, `https://services.swpc.noaa.gov/json/rtsw/`, `https://services.swpc.noaa.gov/products/animations/`, `https://services.swpc.noaa.gov/products/summary/`, `https://services.swpc.noaa.gov/products/geospace/`
- Docs: `https://www.swpc.noaa.gov/products-and-data`, `https://www.swpc.noaa.gov/products/aurora-30-minute-forecast`, `https://www.swpc.noaa.gov/products/aurora-viewline-tonight-and-tomorrow-night-experimental`, `https://www.swpc.noaa.gov/products/planetary-k-index`, `https://www.swpc.noaa.gov/products/alerts-watches-and-warnings`, `https://www.swpc.noaa.gov/products/goes-magnetometer`, `https://www.swpc.noaa.gov/products/goes-x-ray-flux`, `https://www.swpc.noaa.gov/products/wsa-enlil-solar-wind-prediction`
- Sample endpoints (each `CORS:*` verified): `https://services.swpc.noaa.gov/json/ovation_aurora_latest.json`, `https://services.swpc.noaa.gov/text/aurora-nowcast-hemi-power.txt`, `https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json`, `https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json`, `https://services.swpc.noaa.gov/products/noaa-scales.json`, `https://services.swpc.noaa.gov/products/alerts.json`, `https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json`, `https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json`, `https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json`, `https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json`, `https://services.swpc.noaa.gov/products/kyoto-dst.json`, `https://services.swpc.noaa.gov/json/geospace/geospace_dst_1_hour.json`, `https://services.swpc.noaa.gov/json/goes/primary/magnetometers-1-day.json`, `https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json`, `https://services.swpc.noaa.gov/json/enlil_time_series.json`, `https://services.swpc.noaa.gov/products/animations/ovation_north_24h.json`
- Local baseline: `X:\0CODING\React Apps\spaceweather\CONTEXT.md`, `X:\0CODING\React Apps\spaceweather\docs\adr\0001-client-side-only-architecture.md`, `X:\0CODING\React Apps\spaceweather\docs\adr\0002-color-tokens-and-dark-theme.md`, `X:\0CODING\React Apps\spaceweather\README.md:34`, `X:\0CODING\React Apps\spaceweather\src\products/*.ts`

### Competitor primary sources
- `https://www.spaceweatherlive.com/`, `https://www.spaceweatherlive.com/en/auroral-activity/aurora-forecast.html`, `https://www.spaceweatherlive.com/en/aurora-alerts.html`, `https://spaceweatherlive.soft112.com/`, `https://spark.mwm.ai/en/apps/spaceweatherlive/1435501021`
- `https://www.jrustonapps.com/apps/my-aurora-forecast`, `https://apps.apple.com/us/app/my-aurora-forecast-alerts/id1073082439`
- `https://aurorawatch.lancs.ac.uk/alerts/`, `https://mwm.ai/apps/aurorawatch-uk-aurora-alerts/946141347`, `https://apps.apple.com/gb/app/aurorawatch-uk-aurora-alerts/id946141347`
- `https://cdn.softservenews.com/Aurora.htm`, `https://cdn.softservenews.com/en/aurora-borealis-breaking-news/aurora-borealis-alerts-gets-new-features-300050.html`, `https://www.softservenews.com/members/aurora-alerts-north-america.html`, `https://aurora-alerts.com/`

### Web platform primary sources
- MDN: `https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API`, `https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission_static`, `https://developer.mozilla.org/en-US/docs/Web/API/Push_API`, `https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API`, `https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition`, `https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching`, `https://developer.mozilla.org/en-US/docs/Web/API/Cache`, `https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage`, `https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API`, `https://developer.mozilla.org/en-US/docs/Web/API/Window/indexedDB`, `https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria`, `https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share`, `https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API`, `https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API`, `https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas`, `https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API`, `https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate`, `https://developer.mozilla.org/en-US/docs/Web/API/Web_Periodic_Background_Synchronization_API`
- Specs: `https://notifications.spec.whatwg.org/`, `https://w3c.github.io/push-api/`, `https://w3c.github.io/geolocation/`, `https://w3c.github.io/screen-wake-lock/`, `https://w3c.github.io/vibration/`, `https://w3c.github.io/web-share/`, `https://wicg.github.io/periodic-background-sync/`
- web.dev / Chrome / MS Learn: `https://web.dev/articles/user-location`, `https://web.dev/learn/pwa/service-workers`, `https://developer.chrome.com/docs/capabilities/periodic-background-sync`, `https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/background-syncs`, `https://vite-pwa-org.netlify.app/`
- caniuse / discourse: `https://caniuse.com/notifications`, `https://caniuse.com/mdn-api_serviceworkerglobalscope_push_event`, `https://caniuse.com/geolocation`, `https://caniuse.com/mdn-api_indexeddb`, `https://caniuse.com/web-share`, `https://caniuse.com/wake-lock`, `https://caniuse.com/vibration`, `https://meta.discourse.org/t/push-notification-subscription-in-ios-pwa-silently-failing-because-of-sw-not-controlling-the-app/402645`

---

*Generated via three parallel research agents against live primary sources, synthesized 2026-08-25. Re-verify CORS and NOAA viewline status before implementation; SWPC updates products without versioning.*
