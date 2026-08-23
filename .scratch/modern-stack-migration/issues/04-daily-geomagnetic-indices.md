# 04 — Daily geomagnetic indices end-to-end

**What to build:** the daily geomagnetic indices page migrates onto the established pattern: a typed parser models the 30-day table of Kp and A indices per station (Fredericksburg middle-latitude, College high-latitude, estimated planetary); a semantic table renders the exact numbers; a Kp history timeline chart sits above it; the storm-scale color classes (`kp01`–`kp9`) color the table as today. The old NOAA image graph component (with its broken `geospacegeospace` URL and "K-index" label) is deleted — the page's own chart replaces it.

**Blocked by:** 01 — Toolchain migration, 03 — 27-day outlook end-to-end

**Status:** ready-for-agent

- [x] The daily indices fetch returns a typed per-station model via a pure parser
- [x] The page shows the 30-day table with all stations and the estimated planetary column
- [x] A Kp history timeline chart renders above the table with the same data (shape-distinct series per the chart standard)
- [x] The Kp color classes are preserved; the broken graph image URL is corrected
- [x] An "As of" timestamp
- [x] Parser unit tests (real fixture), page smoke test, Playwright journey, and axe audit pass

## Comments

- Implemented 2026-08-23. The parser handles NOAA's glued negative K values on partial (today) rows (`0-1-1`) and keeps `-1` "no data" placeholders in the model; `-1` cells render without the storm-scale token class. The old image graph component was deleted rather than fixed — the page's own Kp history chart (with correct vocabulary and no broken URL) replaces it, which resolves the pre-existing "K-index" label finding below. The kp01 text color tweak (contrast) in Tables.scss was authored by the maintainer and is intentional.
- Table layout: two-row header (`scope=colgroup` station groups + `scope=col` value columns), 28 columns, kp token classes on K cells.