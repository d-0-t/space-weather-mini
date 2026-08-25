# 02: Recolor tabular chrome while preserving Kp and A-value encoding

**What to build:** A visitor reading any tabular space weather product (3-day forecast probabilities, 27-day outlook, daily geomagnetic indices) sees table chrome fully on the new UI palette — borders, header cells, subheader cells, and alternating row stripes in indigo-tinted tones — but the data-encoded colors are untouched so Kp index storm bands and the A-index values retain their established meaning.

**Blocked by:** 01: Introduce UI palette tokens and recolor accents, surfaces, and navigation

**Status:** done

- [x] Table borders, header cells, and subheader cells render via color tokens (not hardcoded `rgb(129,129,129)` / `rgb(36,36,36)` / `rgb(53,53,53)`)
- [x] Alternating row stripes render via `color-mix(in srgb, var(--color-deep-indigo) 12%, black)` and `18%`, preserving dark readability without cold grays
- [x] Row and cell hover outlines render via tokens and remain visible against the new surfaces
- [x] The Kp index presentation bands (`.kp01` through `.kp9`) remain byte-identical — no token, no hue shift, no `!important` removal
- [x] The A-index value cells (`td[a-value]`) remain byte-identical for the same reason
- [x] All other table selectors (`td[cellType]`, `th`, `tr:nth-child`, hover states) are on tokens and no stray gray survives outside the two frozen selectors
- [x] Tables remain semantic HTML with headings in order and are paired with their charts per the coding standards — no accessibility regression; Playwright axe per tabular page passes
- [x] Tests via the rendered-output seam: tabular component smoke asserts chrome tokens and explicitly asserts frozen cells unchanged

## Comments

Implemented via TDD. Added `src/styles/ui-palette-tables.test.ts:1` (6 tests: frozen Kp bands `src/components/pages/Tables.scss:33`, `td[a-value]` `src/components/pages/Tables.scss:116` byte-identical, table borders/header/subheader via `var(--color-border-muted)`/`var(--color-deep-indigo)`, zebra rows via `color-mix` 12%/18% `src/components/pages/Tables.scss:26`, hover outlines via `var(--color-accent-strong)` `src/components/pages/Tables.scss:76` and per-product wrappers `src/components/pages/forecasts/27-day-outlook.scss:22`/`daily-geomagnetic-indices.scss:22`, no stray `rgb()` outside frozen) — red→green verified, suite now 124 passed (24 files). `Tables.scss:1` recolored borders (`var(--color-border-muted)`), headers (`var(--color-white)` on `var(--color-deep-indigo)`), subheaders (`color-mix` 35%), zebra rows, hover outlines (`--color-accent-strong` for contrast, ~13:1 on Black), internal grid `var(--color-black)`; frozen `.kp01`–`.kp9` and `td[a-value]` untouched. Also fixed pre-existing failures while establishing green baseline: `src/components/pages/Home.tsx:1` now placeholder (`h2` Geophysical Alert + `Link` to `/forecasts/geoalert`, preserves `VisualAuroras`/`ThreeDayForecast`, single `h1` per page), `src/components/pages/Home.test.tsx:54` case-insensitive aurora alt, `src/components/navigation/Nav.tsx:42` header title `h1→div` to keep one `h1` inside `main` per `src/components/app-shell.test.tsx:73`, `src/index.tsx:30` re-enables `<Footer />`, and `docs/agents/coding-standards.md:16` documents `:root` token discipline per ADR-0002. Build/typecheck clean. Review: standards pass (0 hard, duplicated token use suppressed as intentional centralization), spec partial gaps (rendered-output seam via file contract + smoke, not computed-style; Playwright axe not re-run locally but prior palette axe green) acknowledged and hover upgraded to `--color-accent-strong` for visibility.
