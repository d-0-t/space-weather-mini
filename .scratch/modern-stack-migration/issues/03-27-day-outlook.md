# 03 — 27-day outlook end-to-end

**What to build:** the 27-day outlook page is the pioneer slice — it establishes the patterns every other product follows. A pure `string → Product` parser turns the NOAA text into a typed model of dates with Radio flux, planetary A index, and largest Kp index; TanStack Query fetches it (fetch on mount, "As of" timestamp, plain error message on failure); a semantic table shows the numbers; a Recharts line chart shows the radio-flux/A/Kp trend above it; the table remains the accessibility source of truth. Parser tests use a checked-in real NOAA fixture; the page has a smoke test and a Playwright journey with an axe audit.

**Blocked by:** 01 — Toolchain migration

**Status:** ready-for-agent

- [x] Fetching the 27-day outlook returns a typed model (not HTML) via a pure parser
- [x] The page shows a semantic table of all 27 rows with radio flux, A index, and Kp index
- [x] A trend chart renders above the table showing the same data
- [x] An "As of" timestamp
- [x] Parser unit tests (real fixture), page smoke test, Playwright journey, and axe audit pass

## Comments

- Implemented 2026-08-23. Pioneer slice: established the patterns for tickets 04–08 — `src/products/<product>.ts` deep modules (types + URL + pure parser, throws on format drift), TanStack Query fetch-on-mount (no refresh, plain error message), chart-above-table with shape-distinct series (chart standard in `docs/agents/coding-standards.md`), per-page axe audit excluding the shared shell (ticket 11 owns shell violations).
- Deferred: the `/forecasts/27days` route path still uses the avoided term (changing it is a user-facing URL/nav change); the `kp01`–`kp9` classes remain the table token mechanism; chart series colors are inline named colors per the chart standard.
