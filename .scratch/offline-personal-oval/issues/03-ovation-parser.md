# 03: OVATION JSON parser + live fixture

**What to build:** A pure `string → Product` parser for `ovation_aurora_latest.json` that validates the grid and maps `Aurora` intensity to bands, with a checked-in live fixture so the canvas has honest data to paint.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Parser validates `Observation Time`, `Forecast Time`, `Data Format === "[Longitude, Latitude, Aurora]"`, `coordinates` as `[[lon,lat,aurora]]` numbers, throws format-changed error mirroring `daily-geomagnetic-indices.ts:35` if shape changes
- [ ] Maps `Aurora 0` → transparent, `1-5 faint / 6-10 moderate / 11-15 strong / 16+ intense` (starting bands, versioned threshold) and exposes `forecastTime`, `observationTime`, `coordinates` typed rows
- [ ] Fixture checked in from live `2026-09-03T16:35Z→17:42Z` sample (65,160 cells, `max 25`, `46k` zeros, `Tromsø 14 / Kiruna 11 / Östersund 3`) plus edge fixtures: empty coordinates, all zeros, single cell `25`, synthetic storm `max 50`, malformed `Data Format`
- [ ] Vitest unit per `27-day-outlook.test.ts` pattern: feed raw JSON string, assert typed product, assert band mapping, assert empty/all-zero handled, assert malformed throws; no `any`
- [ ] Query key `["ovation","live"]` with `live:true` flag ready for TanStack `refetchInterval` 5 min, `refetchIntervalInBackground:false`, `staleTime` 60s
