# 03: OVATION JSON parser + live fixture

**What to build:** A pure `string → Product` parser for `ovation_aurora_latest.json` that validates the grid and maps `Aurora` intensity to bands, with a checked-in live fixture so the canvas has honest data to paint.

**Blocked by:** 01

**Status:** done

- [x] Parser validates `Observation Time`, `Forecast Time`, `Data Format === "[Longitude, Latitude, Aurora]"`, `coordinates` as `[[lon,lat,aurora]]` numbers, throws format-changed error mirroring `daily-geomagnetic-indices.ts:35` if shape changes
- [x] Maps `Aurora 0` → transparent, `1-5 faint / 6-10 moderate / 11-15 strong / 16+ intense` (starting bands, versioned threshold) and exposes `forecastTime`, `observationTime`, `coordinates` typed rows
- [x] Fixture checked in from live `2026-09-03T16:35Z→17:42Z` sample (65,160 cells, `max 25`, `46k` zeros, `Tromsø 14 / Kiruna 11 / Östersund 3`) plus edge fixtures: empty coordinates, all zeros, single cell `25`, synthetic storm `max 50`, malformed `Data Format`
- [x] Vitest unit per `27-day-outlook.test.ts` pattern: feed raw JSON string, assert typed product, assert band mapping, assert empty/all-zero handled, assert malformed throws; no `any`
- [x] Query key `["ovation","live"]` with `live:true` flag ready for TanStack `refetchInterval` 5 min, `refetchIntervalInBackground:false`, `staleTime` 60s

## Comments

- Implemented 2026-09-04 via TDD (red: missing `src/products/ovation.ts`, then green slices), then two-axis review. Suite green: `tsc --noEmit`, 590 Vitest (65 files, 12 new), `vite build` (+ PWA `sw.js`).
- **Parser** – `src/products/ovation.ts`: `parseOvation(text)` + `auroraBand(n)` + `OvationCell`/`OvationProduct`/`AuroraBand` (`none` renders transparent), `OVATION_URL`, `OVATION_QUERY_KEY = ["ovation","live"]`, `OVATION_LIVE = true`, `OVATION_REFETCH_INTERVAL_MS` 5 min, `OVATION_REFETCH_IN_BACKGROUND = false`, `OVATION_STALE_TIME_MS` 60s, `OVATION_BAND_VERSION = 1`. Error suffix `– the NOAA format may have changed` mirrors `daily-geomagnetic-indices.ts`. Extra payload fields tolerated: live serves `type: "MultiPoint"`, not the spec's stale `FeatureCollection` – noted in code so the parser tracks the served shape.
- **Fixture deviation (honest)** – the ticket's `2026-09-03T16:35Z→17:42Z` sample (`max 25`, Tromsø 14) was no longer fetchable; checked in live `2026-09-04T13:20:00Z→14:33:00Z` instead (`src/products/fixtures/ovation_aurora_latest.json`, 65,160 cells, `max 14`, 49,057 zeros, Tromsø 18E/69N = 1 pinned in test). Edge cases follow the repo's inline pattern (`27-day-outlook.test.ts` uses inline strings, not separate files): empty, all-zero, single `25`, storm `max 50`, malformed `Data Format`, missing stamp, non-numeric row, invalid JSON – via a `makeOvationJson` helper.
- **Review fixes** – Standards: no hard violations; kept query constants in the product module per this ticket, kept the repeated error suffix per repo pattern, kept the band `if`-cascade as the clearest table. Spec: no scope creep, no canvas leaked; `auroraBand(<1) → "none"` unreachable via the parser (negatives rejected first).
- **Awaiting human review – not committed.** Working tree holds `src/products/ovation.ts`, `src/products/ovation.test.ts`, `src/products/fixtures/ovation_aurora_latest.json`, and this file.
