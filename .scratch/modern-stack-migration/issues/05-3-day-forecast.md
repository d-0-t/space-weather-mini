# 05 — 3-day forecast end-to-end

**What to build:** the 3-day forecast page migrates onto the established pattern: a typed parser models the three sections (Geomagnetic activity, Solar radiation storm, Radio blackout), each with its details, probability table, and Rationale prose; semantic tables render the probabilities; a single Kp forecast line (the three days merged end to end over the 3-hour intervals) renders above the Geomagnetic activity table; the `regionale` typo is gone. The page keeps the original issued display (UTC and local time) plus the product's author line, and the details prose preserves NOAA's source line breaks.

> **Deviation from the original wording (agreed 2026-08-23):** the original ticket asked for a "Regional text" per section. The real NOAA 3-day-forecast.txt product carries no per-region prose — verified against the 2019, 2023, and 2026-08-23 archives — each section ends with a "Rationale:" paragraph instead. The parser therefore models `rationale`, and the CONTEXT.md glossary was updated accordingly ("Regional text" → "Rationale").

**Blocked by:** 01 — Toolchain migration, 03 — 27-day outlook end-to-end

**Status:** ready-for-agent

- [x] The 3-day forecast fetch returns a typed model with three typed sections via a pure parser
- [x] Each section renders its details, probability table, and Rationale prose
- [x] A single Kp forecast line renders above the Kp breakdown table with the same data (the three days merged end to end)
- [x] Vocabulary matches CONTEXT.md: Geomagnetic activity, Solar radiation storm, Radio blackout, Rationale
- [x] Issued details shown as in the original page: issued time in UTC and local time, plus the product's author line
- [x] Parser unit tests (real fixture), page smoke test, Playwright journey, and axe audit pass