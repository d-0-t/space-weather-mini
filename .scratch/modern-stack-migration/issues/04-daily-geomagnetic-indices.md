# 04 — Daily geomagnetic indices end-to-end

**What to build:** the daily geomagnetic indices page migrates onto the established pattern: a typed parser models the 30-day table of Kp and A indices per station (Fredericksburg middle-latitude, College high-latitude, estimated planetary); a semantic table renders the exact numbers; a Kp history timeline chart sits beside it; the storm-scale color classes (`kp01`–`kp9`) color the table as today. The broken image URL in the estimated planetary K graph (`geospacegeospace`) is fixed as part of the migration.

**Blocked by:** 01 — Toolchain migration, 03 — 27-day outlook end-to-end

**Status:** ready-for-agent

- [ ] The daily indices fetch returns a typed per-station model via a pure parser
- [ ] The page shows the 30-day table with all stations and the estimated planetary column
- [ ] A Kp history timeline chart renders above the table with the same data (shape-distinct series per the chart standard)
- [ ] The Kp color classes are preserved; the broken graph image URL is corrected
- [ ] An "As of" timestamp
- [ ] Parser unit tests (real fixture), page smoke test, Playwright journey, and axe audit pass

## Comments

- Review finding (pre-existing): the estimated-planetary-K graph component labels itself "Estimated Planetary K-index (graph)" — per CONTEXT.md the avoided term "K-index" must become "Kp index" during this migration. (Also carries the broken `geospacegeospace` URL noted in the ticket body.)