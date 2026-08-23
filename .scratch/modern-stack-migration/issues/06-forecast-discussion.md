# 06 — Forecast discussion end-to-end

**What to build:** the forecast discussion page migrates onto the established pattern with its light model: a pure parser extracts the issued timestamp and the four sections — Solar Activity, Energetic Particle, Solar Wind, and Geospace — preserving the prose as text. The page renders the sections with proper heading structure and the "As of" timestamp; no chart (narrative product).

**Blocked by:** 01 — Toolchain migration, 03 — 27-day outlook end-to-end

**Status:** ready-for-agent

- [ ] The forecast discussion fetch returns a typed model (issued timestamp + four sections) via a pure parser
- [ ] The page renders all four sections with correct heading hierarchy; "Geospace" is used only for its section
- [ ] An "As of" timestamp
- [ ] Parser unit tests (real fixture), page smoke test, Playwright journey, and axe audit pass
