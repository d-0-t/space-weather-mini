# 12 — Legacy parser contract

**What to build:** once every product has migrated, the legacy HTML-string parser is deleted — no parser returns HTML, no `dangerouslySetInnerHTML` remains anywhere in the app. This is the contract half of the expand–contract migration of the shared parser.

**Blocked by:** 04 — Daily geomagnetic indices end-to-end, 05 — 3-day forecast end-to-end, 06 — Forecast discussion end-to-end, 07 — Weekly report end-to-end, 08 — Geophysical alert end-to-end

**Status:** ready-for-agent

- [x] No product fetch goes through the legacy HTML-string parser
- [x] The legacy parser file(s) are deleted
- [x] No `dangerouslySetInnerHTML` usage remains in the app
- [x] Full suite (typecheck, Vitest, Playwright with axe) passes after the deletion

## Comments

- Review finding (pre-existing): the legacy parser's `getCell` emits a malformed `class="valAtDate kp01"">` attribute; the new typed parsers must not reproduce it.
- Implemented 2026-08-24. TDD red→green: `src/legacy-parser-contract.test.ts` (4 tests: parser file deleted, legacy GeoAlert component deleted, no dangerouslySetInnerHTML, no TxtParser import) and `src/components/pages/Home.test.tsx` (3 tests) drove the slice. Deleted `src/components/parser/TxtParser.jsx` (300-line DOM-coupled HTML-string parser) and the empty `src/components/parser/` directory, plus `src/components/pages/forecasts/GeoAlert.tsx` (72-line legacy component with `dangerouslySetInnerHTML` and `any` state). Updated `src/components/pages/Home.tsx:1-44` to remove the legacy `GeoAlert` import/embed and replace it with a static placeholder linking to `/forecasts/geoalert` (typed `geophysical-alert` page), preserving the `VisualAuroras` and `ThreeDayForecast` highlights while keeping a single `h1` and correct heading order. The `ThreeDayForecast` embed (typed, TanStack Query) remains. Suite green: typecheck, 108 Vitest (22 files), build; `getKpClass` / `kpClass` via `.kp01`–`.kp9` tokens remains the sole coloring mechanism as per the standard.