# 01: Live Now on Home — Scales, Kp, ultracompact 3-day, solar-wind banner + Details rename

**What to build:** A single demoable Home dashboard that makes "is it happening now?" visible in one glance: a NOAA scale pill row, a live planetary K-index dashboard, an ultracompact Kp-index forecast table that compacts the 3-day text, a live solar-wind / IMF / hemispheric-power / Dst banner with expandable detail, and the nav wayfinding from "Forecasts & Discussion" to "Details" — the full tranche 1a scope, vertical through parsers, queries, UI and tests.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Home shows a Scales Now pill from the NOAA Scales product with current `G:{Scale,Text}` and Day-1–3 G/R/S probs, rendered with `As of {issuedUTC} · Updated {age}` and stale-cache `⚠ Live data unavailable — showing {age}-old cache` when the fetch fails (`aria-live="polite"`), polled every 5 min per the live polling ADR and paused when hidden
- [ ] Home shows a planetary K-index live dashboard from the observed and forecast feeds: current `noaa_scale` G-pill (G1 at Kp 5 per the geomagnetic storm scale), 8-day/3h history and 3-day/3h forecast bars/charts with frozen Kp band tokens and per-card freshness, paired Recharts/table per accessibility standard; the daily geomagnetic indices big table remains reachable at its Details route as archive with no parser change
- [ ] Home keeps the OVATION aurora image pair between the live strips and the forecast, and shows an ultracompact table `Kp-index forecast | Min | Max` per day (min/max of the day's 8 Kp values with G bonus when max ≥5 plus a link "Full 3-day →" to the full report) derived as a view transform, not a new product
- [ ] Home shows a one-line live banner `Bz (GSM) · Bt · speed · density · hemispheric power GW · Dst` from the summary/hemispheric-power/Dst products with `As of` ages, expandable to 6-hour Recharts sparklines (each paired with its table) polled `60s` for summary and `5m` for the rest, with southward Bz explainability copy using glossary terms
- [ ] Disclosure trigger reads **Details** (was "Forecasts & Discussion") and still exposes the 6 text products (`geophysical alert`, `daily` big table, `3-days`, `weekly`, `27 days`, `discussion`) at the existing `/forecasts/*` routes; Home intro explains "Live now on Home — full reports in Details"
- [ ] Each new feed has a pure `string → Product` parser with real SWPC fixtures checked in and error throws on format change, plus Vitest parser units, Home component smoke assertions and a Playwright Home journey with axe audit
