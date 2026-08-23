# 08 — Geophysical alert end-to-end

**What to build:** the geophysical alert page migrates onto the established pattern with its light model: a pure parser extracts the issued timestamp and the observations and predictions sections, preserving prose as text. The page keeps the user-facing label "Geophysical Alert Message" (per CONTEXT.md) while internal naming is `geophysical-alert`. The "As of" timestamp is prominent — this is the freshest product in the app.

**Blocked by:** 01 — Toolchain migration, 03 — 27-day outlook end-to-end

**Status:** ready-for-agent

- [x] The geophysical alert fetch returns a typed model (issued timestamp + observations and predictions) via a pure parser
- [x] The page renders with the user-facing label "Geophysical Observations and Predictions"; internal naming follows the glossary
- [x] The issued time in UTC and local time, plus the product's author line
- [x] Parser unit tests (real fixture), page smoke test, Playwright journey, and axe audit pass

## Comments

- Implemented 2026-08-23. Light model per the spec: `issued` + `author` + three prose blocks (`message` for the solar indices paragraph, `observed` and `predicted` for the storm paragraphs), preserving NOAA's source line breaks (rendered with `pre-line`). The parser reuses `scanHeader`/`formatIssuedLocal` and validates that the last two paragraphs contain "observed" and "predicted" respectively, with descriptive errors for missing sections. The page follows the narrative pattern (no chart) — `h1` Geophysical Alert Message with `h2` Observations/Predictions, the message paragraph as introductory prose, issued UTC/local + author, plain error message, and `id="geo-alert"` preserved for the existing smoke journey. Playwright a11y audit and 12 Vitest tests (8 parser + 4 page) pass; `App.tsx` now routes `geoalert` to the typed page.
