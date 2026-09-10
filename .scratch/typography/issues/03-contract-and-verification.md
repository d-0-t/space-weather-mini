# 03: Contract sweep and verification of the type-token system

**What to build:** The migration contract closes: no raw font-size values or raw-pixel media queries survive anywhere, the coding standards cite the new rules so future code (human or agent) reaches for Type tokens and `respond-to` instead of inventing values, and the whole suite plus a per-page visual pass proves the system is green end to end.

**Blocked by:** 01, 02.

**Status:** ready-for-agent

- [ ] Grep over all stylesheets confirms zero raw rem/em font-size values and zero raw-pixel media queries, with only the three documented data-readout literals remaining
- [ ] The coding-standards document records the type-token rule and the `respond-to`-only media-query rule, citing ADR-0009, with the frozen readout exception noted
- [ ] The glossary Type token and Breakpoint entries match the shipped system (no doc/code drift, unlike the status-red drift found under ADR-0002)
- [ ] Full Vitest and Playwright suites pass, including computed-style checks at widths below and above md
- [ ] Visual pass per page (home, conditions, webcams, forecasts, about/sources/explainers) at phone and desktop widths confirms consistent typography and stepped headings
