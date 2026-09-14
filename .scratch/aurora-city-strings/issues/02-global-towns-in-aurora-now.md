# 02: Global towns element in Aurora now

**Type:** task

**Status:** resolved

**Blocked by:** 01 (resolved 2026-09-14)

**What:** Build the "towns where it may be visible" element decided in ticket 01.
A global city list under the Kp values in the Aurora now panel: each town shows a
flag, its name and an ordinal probability, and only appears while its approximate
geomagnetic latitude is at or poleward of the Tips reach edge for the current Kp
(`E = 66° − 2° × Kp`) **and** the sun there is at or below −12° (astronomical
twilight or darker).

**Seams (confirmed with the human 2026-09-14):**

- **Mount.** `src/components/pages/home/components/AuroraNow/AuroraNow.tsx`,
  directly under the Kp block (`<KpBar kp={currentKpRounded} />`), before
  `<ViewDistanceLine />`. New `ReachTowns.tsx` + `ReachTowns.scss`. No new
  route; the interpreter paragraph keeps its shape (CONTEXT: Interpreter is one
  paragraph).
- **Driver.** The same live observed Kp the panel already holds (`currentKp`,
  the latest observed value) — the raw value, never the rounded badge. No
  forecast Kp; the list shifts as Kp revises (K1).
- **Eligibility.** Town's approximate |geomagnetic latitude| ≥ `E(Kp)`. No
  equatorward buffer — the source rule stays exact; the "sightings run
  equatorward" caveat carries the slack.
- **Dark gate.** Sun altitude at the town ≤ −12° (astronomical twilight or
  Night per `CONTEXT.md`), via the existing suncalc helpers in `data/sun.ts`.
  Recomputed as time passes — a 60 s tick (pattern: `webcams.tsx:218`) plus the
  panel's 5-minute Kp refetch; never a stale list.
- **Probability band (in-app convention — no source fixes thresholds; document
  in code + tests).** Margin `d = |MLAT| − E`: `0 ≤ d < 2` → "Possible" (low on
  the poleward horizon, at the edge of reach); `2 ≤ d < 6` → "Likely";
  `d ≥ 6` → "Very likely". Ordinal words and icons only — never percentages
  (N10).
- **Dedup/rank.** At most one town per probability band per country (within a
  band/country keep the largest margin, then alphabetical); display ordered by
  band ("Very likely" first), then margin descending, then city name. Cap the
  rendered rows so the panel stays scannable (recommend top 12; confirm the cap
  in review).
- **Empty state.** When nothing qualifies, render nothing or one honest line —
  never an empty heading or filler. Decide in build.
- **City data.** Static `src/data/reach-cities.ts`:
  `{ city, country, countryCode, lat, lon, mlat }`. MLAT computed once with a
  documented centered-dipole approximation against a cited IGRF epoch — verify
  the pole/epoch against the primary source before committing; no recalled
  values; method + error note in the file. Cover ~45–70° |MLAT| across
  continents and many countries so each band can surface (the ~70° bound avoids
  deep-polar-cap overreach). No fetch, offline-safe (ADR-0001).
- **Logic.** Pure `src/products/reach-towns.ts` — eligibility, band, dark
  filter, dedup/rank; unit pins in `reach-towns.test.ts` at every boundary
  (`d = 0/2/6`, sun `−12°`, Kp `0/9`, dedup).
- **Visual + a11y.** Flag + city + probability icon. Reuse the existing flag
  helper `flagSrc` from `webcam-card-parts.tsx` (same pattern as webcams,
  PlaceFinder and WeatherDaily): `flagSrc(countryCode, "16x12")` with a `2x/3x`
  srcSet, explicit width/height, the country name in `alt`/`title`,
  `loading="lazy"` — store ISO 3166-1 alpha-2 per city, no bundled assets, no
  flag emoji (Windows cannot render them); a failed flagcdn load falls back to
  the alt text, as on the webcams page. Probability icon carries `title` with
  the band's explanation and its color is redundant only — no red/green
  good–bad semantics (N4), colour-blind safe, WCAG 2.1 AA.
- **Caveats + attribution.** One visible line under the list (not title
  attributes alone): may be seen, approximate averages,
  geomagnetic-not-geographic, Kp is a 3-hour planetary average, absence ≠ no
  aurora. Link the rule's owner (Tips on Viewing the Aurora) through the
  panel's source row or a small inline source key.
- **Vocabulary.** Graduate the element's term via domain-modeling (proposed:
  "Reach towns") into `CONTEXT.md`; touch the Interpreter entry only if the
  panel's shape changes.

**Checklist:**

- [x] City array authored, MLAT method + IGRF epoch documented and cited, spot values pinned
- [x] Pure logic + boundary tests
- [x] Component mounted under the Kp block (Aurora now); flags/title/alt, not colour-only; axe clean
- [x] Caveat line + Tips attribution
- [x] CONTEXT.md term graduated
- [x] Full suite green (Vitest + Playwright + typecheck + build)

**Bounds:** no per-town promise; no percentages; no copy or parity from the
Scales page's US rows; no editing NOAA wording; no Bortle/SQM; no backend
(ADR-0001).

**Deliverable:** the towns element live in Aurora now, tests green — or a written
back-out naming the seam that failed.

---

## Answer

Built and verified 2026-09-14; **not committed** — awaiting human review, per
the session's instruction. The Reach towns element ships in Aurora now,
mounted directly under `<KpBar />` and above `<ViewDistanceLine />`, driven
by the raw observed `currentKp` (never the rounded badge); the rest of the
panel is unchanged. Nothing on the NOAA Scales page's US rows was shipped or
paraphrased.

What landed, against the confirmed seams:

- **City data** — `src/data/reach-cities.ts`: 53 towns between 45 and 70°
  |MLAT| across 23 countries (Europe, North America, Asia, Oceania, South
  America). MLAT is the documented centered-dipole approximation against the
  IGRF-14 geomagnetic north pole at epoch 2025.0, 80.8° N 72.8° W (WDC for
  Geomagnetism, Kyoto pole table, read live 2026-09-14). Residual against WDC
  Kyoto's own IGRF-14 dipole transformation is ≤ 0.3° (Tromsø 67.51 vs 67.40,
  Rovaniemi 63.62 vs 63.49, Yellowknife 68.52 vs 68.37, Hobart −49.58 vs
  −49.40, Ushuaia −45.63 vs −45.44) — spot checks pinned in
  `reach-cities.test.ts`. Coordinates from Open-Meteo geocoding (read
  2026-09-14). Flags need lowercase codes (flagcdn 404s uppercase), so the
  array stores lowercased ISO 3166-1 alpha-2.
- **Pure logic** — `src/products/reach-towns.ts`: Tips edge `E = 66° − 2° ×
  Kp`, bands `0 ≤ d < 2` Possible / `2 ≤ d < 6` Likely / `d ≥ 6` Very likely,
  the `−12°` dark gate, one town per band per country (largest margin wins,
  ties alphabetical), order band → margin desc → city, cap
  `REACH_TOWNS_LIMIT = 12`. The solar model is injected, so every boundary is
  unit-pinned in `reach-towns.test.ts` without a clock.
- **Component** — `ReachTowns.tsx` + `ReachTowns.scss`: 60 s tick (the
  webcams pattern) plus the panel's 5-minute Kp refetch; the probability glyph
  is 1/2/3 MUI signal bars (the filled-bar count carries the rank; colour is
  redundant), titled with the band explanation and named by an sr-only ordinal
  word; flags via `flagSrc` with 2x/3x srcSet, `alt`/`title` = country, lazy;
  one visible caveat line (may be seen, approximate averages,
  geomagnetic-not-geographic, Kp a 3-hour average, absence ≠ no aurora) with
  the Tips on Viewing the Aurora attribution link. Empty state: renders
  nothing.
- **Docs** — `CONTEXT.md` gains the "Reach towns" term; the Interpreter entry
  is untouched (the panel's shape did not change).
- **Tests** — Vitest 88 files / 908 tests green; Playwright 83/83 on a fresh
  build (the two-worker run flaked on live-NOAA pages — smoke and weekly
  report — each of which passed standalone and in the single-worker run);
  typecheck and build clean. The pre-existing stale md-vs-lg
  `e2e/typography.spec.ts` (failing on HEAD) was aligned to the `lg` step
  decided in `.scratch/typography/spec.md`; ADR-0009 carries a revision note
  and the coding standards wording is updated.

The cap of 12 was the recommended default — review may confirm or lower it.
