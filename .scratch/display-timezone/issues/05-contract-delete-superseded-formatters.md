# 05: Contract — delete the superseded formatters

**What to build:** The expand–contract close for the display-time module: after the dashboard, product pages, and Local conditions/webcams migrations land, the old scattered formatting helpers and duplicated month-name tables are deleted so that all absolute-time rendering funnels through the single display-time module. No user-visible behavior change beyond what the earlier tickets delivered; the full suite stays green.

**Blocked by:** 02 (foundation & modal), 03 (Dashboard under one clock), 04 (product pages).

**Status:** done

- [x] No component formats an absolute time outside the display-time module
- [x] Superseded helpers and duplicated month-name code are deleted, not just unused
- [x] Full test suite passes with no behavior change

## Comments

- Ticket 04 landed (2026-09-09): `formatIssuedLocal` and its test are already deleted — its only callers were the six product pages, which now render through `IssuedLine`/`formatIssued`. What remains for this sweep: the `live-helpers` shim (ViewDistanceLine, alerts data layer, its own tests) and the MONTHS_SHORT tables in `3-day-forecast.tsx` / `27-day-outlook.tsx`.
- Implemented 2026-09-09, TDD red→green per slice. `MONTHS_SHORT` is now exported from `display-time.ts` (the single shared short-month table) with a pinning test plus direct `parseTimeTag` wire-shape/NaN tests; `alerts.ts` (`newestAlertTime`, `forecastBreachInNext24h`) and `AlertsContext` (match sort) now import `parseTimeTag` from `display-time`; `ViewDistanceLine` drops the dead `live-helpers` `formatAge` import and the `FreshnessLine` import whose only use was the commented-out duplicated freshness block; `3-day-forecast.tsx` (`toTimeTag`) and `27-day-outlook.tsx` (`toMidnightTimeTag`) delete their local `MONTHS_SHORT` copies and import the shared one; `live-helpers.ts` + `live-helpers.test.ts` deleted; `docs/agents/coding-standards.md` drops the shim parenthetical.
- Judgement calls for review: (1) `product-header.ts` keeps its own `MONTHS` parse table — `display-time` imports `parseIssuedDate` from it, so sharing would cycle; the sweep dedupes the two component copies only. (2) `ViewDistanceLine`'s `AURORA_FORECAST_URL`/`VIEW_DISTANCE_COPY`/`OpenInNew` dead code is pre-existing and out of scope — left untouched. (3) The deleted `live-helpers.test.ts` `formatAge` Date.now-mock tests are superseded by `display-time.test.ts` injected-`now` tests; `formatUtcShort`/`formatLocalShort` literals are pinned as `formatShort` UTC/Local cases; `toEpoch` NaN/parsing is pinned as direct `parseTimeTag` tests.
- Suite state: 84/84 green on the touched seams (display-time, alerts, Alerts strip, both forecast pages); full Vitest 753 passed, 9 failed — all 9 reproduce on clean HEAD (7 parser issued/author error-message tests + 2 AuroraNow weather one-liner tests, pre-existing). Playwright smoke + six product-page a11y specs 26 passed. Typecheck has 4 pre-existing errors (OvalGlow.test `any` x3, vite-plugin-pwa types) unchanged by this ticket. Not committed — awaiting maintainer review.
