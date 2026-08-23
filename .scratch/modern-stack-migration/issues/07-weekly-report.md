# 07 — Weekly report end-to-end

**What to build:** the weekly report page migrates onto the established pattern with its light model: a pure parser extracts the issued timestamp and the Highlights and Forecast sections, preserving prose as text. The page renders both sections with correct heading structure and the issued time (UTC and local) plus the author line; no chart (narrative product).

**Blocked by:** 01 — Toolchain migration, 03 — 27-day outlook end-to-end

**Status:** ready-for-agent

- [x] The weekly report fetch returns a typed model (issued timestamp + Highlights and Forecast sections) via a pure parser
- [x] The page renders both sections with correct heading hierarchy
- [x] The issued time in UTC and local time, plus the product's author line
- [x] Parser unit tests (real fixture), page smoke test, Playwright journey, and axe audit pass

## Comments

- Implemented 2026-08-23. Light model per the spec: `issued` + `author` + two typed sections (`title` + `dateRange` + `body` prose), preserving NOAA's source line breaks (rendered with `pre-line`). The parser validates both section titles, their date ranges, and rejects missing/empty prose. The page follows the established narrative pattern (no chart) — `h1` Weekly Report with `h2` Highlights/Forecast, issued UTC/local + author, plain error message, and `id="weekly-discussion"` preserved for the existing smoke journey. Playwright a11y audit and 12 Vitest tests (8 parser + 4 page) pass; `Weekly.tsx` legacy file removed.
