# 06 — Forecast discussion end-to-end

**What to build:** the forecast discussion page migrates onto the established pattern with its light model: a pure parser extracts the issued timestamp and the four sections — Solar Activity, Energetic Particle, Solar Wind, and Geospace — preserving the prose as text. The page renders the sections with proper heading structure and the issued time (UTC and local) plus the author line; no chart (narrative product).

**Blocked by:** 01 — Toolchain migration, 03 — 27-day outlook end-to-end

**Status:** ready-for-agent

- [x] The forecast discussion fetch returns a typed model (issued timestamp + four sections) via a pure parser
- [x] The page renders all four sections with correct heading hierarchy; "Geospace" is used only for its section
- [x] The issued time in UTC and local time, plus the product's author line
- [x] Parser unit tests (real fixture), page smoke test, Playwright journey, and axe audit pass

## Comments

- Implemented 2026-08-23. Light model per the spec: `issued` + `author` + four typed sections (`daySummary` + `forecast` prose), preserving NOAA's source line breaks (rendered with `pre-line`). The parser validates the four section titles, their `.24 hr Summary...`/`.Forecast...` markers, and rejects duplicate sections. Each section renders under "Forecast" then "Day Summary" headings (maintainer's chosen labels, matching the legacy page's order). The shared `scanHeader`/`formatIssuedLocal` helpers in `src/products/product-header.ts` now serve all four migrated products.
