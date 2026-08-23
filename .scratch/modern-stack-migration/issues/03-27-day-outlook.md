# 03 — 27-day outlook end-to-end

**What to build:** the 27-day outlook page is the pioneer slice — it establishes the patterns every other product follows. A pure `string → Product` parser turns the NOAA text into a typed model of dates with Radio flux, planetary A index, and largest Kp index; TanStack Query fetches it (fetch on mount, manual refresh, "As of" timestamp, understandable error state with retry); a semantic table shows the numbers; a Recharts line chart shows the radio-flux/A trend beside it; the table remains the accessibility source of truth. Parser tests use a checked-in real NOAA fixture; the page has a smoke test and a Playwright journey with an axe audit.

**Blocked by:** 01 — Toolchain migration

**Status:** ready-for-agent

- [ ] Fetching the 27-day outlook returns a typed model (not HTML) via a pure parser
- [ ] The page shows a semantic table of all 27 rows with radio flux, A index, and Kp index
- [ ] A trend chart renders beside the table showing the same data
- [ ] An "As of" timestamp and a manual refresh control are present; fetch failure shows an error state with retry
- [ ] Parser unit tests (real fixture), page smoke test, Playwright journey, and axe audit pass