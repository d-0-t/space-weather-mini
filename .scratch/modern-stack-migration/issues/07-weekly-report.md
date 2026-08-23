# 07 — Weekly report end-to-end

**What to build:** the weekly report page migrates onto the established pattern with its light model: a pure parser extracts the issued timestamp and the Highlights and Forecast sections, preserving prose as text. The page renders both sections with correct heading structure and the issued time (UTC and local) plus the author line; no chart (narrative product).

**Blocked by:** 01 — Toolchain migration, 03 — 27-day outlook end-to-end

**Status:** ready-for-agent

- [ ] The weekly report fetch returns a typed model (issued timestamp + Highlights and Forecast sections) via a pure parser
- [ ] The page renders both sections with correct heading hierarchy
- [ ] The issued time in UTC and local time, plus the product's author line
- [ ] Parser unit tests (real fixture), page smoke test, Playwright journey, and axe audit pass
