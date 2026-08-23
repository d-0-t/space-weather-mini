# 08 — Geophysical alert end-to-end

**What to build:** the geophysical alert page migrates onto the established pattern with its light model: a pure parser extracts the issued timestamp and the observations and predictions sections, preserving prose as text. The page keeps the user-facing label "Geophysical Alert Message" (per CONTEXT.md) while internal naming is `geophysical-alert`. The "As of" timestamp is prominent — this is the freshest product in the app.

**Blocked by:** 01 — Toolchain migration, 03 — 27-day outlook end-to-end

**Status:** ready-for-agent

- [ ] The geophysical alert fetch returns a typed model (issued timestamp + observations and predictions) via a pure parser
- [ ] The page renders with the user-facing label "Geophysical Alert Message"; internal naming follows the glossary
- [ ] An "As of" timestamp and manual refresh are present
- [ ] Parser unit tests (real fixture), page smoke test, Playwright journey, and axe audit pass