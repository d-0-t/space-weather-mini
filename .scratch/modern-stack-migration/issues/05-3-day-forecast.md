# 05 — 3-day forecast end-to-end

**What to build:** the 3-day forecast page migrates onto the established pattern: a typed parser models the three sections (Geomagnetic activity, Solar radiation storm, Radio blackout), each with its details, probability table, and Regional text; semantic tables render the probabilities; storm-probability bars (Recharts) show each day's outlook beside the tables; the `regionale` typo is gone — the prose is "Regional text" per the glossary.

**Blocked by:** 01 — Toolchain migration, 03 — 27-day outlook end-to-end

**Status:** ready-for-agent

- [ ] The 3-day forecast fetch returns a typed model with three typed sections via a pure parser
- [ ] Each section renders its details, probability table, and Regional text
- [ ] Storm-probability bars render above the tables with the same data (shape-distinct series per the chart standard)
- [ ] Vocabulary matches CONTEXT.md: Geomagnetic activity, Solar radiation storm, Radio blackout, Regional text
- [ ] An "As of" timestamp
- [ ] Parser unit tests (real fixture), page smoke test, Playwright journey, and axe audit pass