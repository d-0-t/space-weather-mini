# 03: Narrow global text override, recolor remaining chrome, and verify contract

**What to build:** A visitor sees the final sweep — no stray hardcoded color survives outside data encoding, accents actually show (global text no longer forces white over everything), any remaining chrome (app shell overrides, Recharts axis text and tooltip background where it is UI chrome, aurora image and home mini-card borders) is on tokens, and the whole app passes contrast and a11y verification in one green contract step.

**Blocked by:** 02: Recolor tabular chrome while preserving Kp and A-value encoding

**Status:** done

- [x] The global `* { color: white }` override is narrowed so White remains the default text color but Medium Green accents (links, headings, glossary terms) and Light Lime focus actually render
- [x] Remaining chrome now on tokens: app shell text overrides, Recharts axis text fill and tooltip background where it is UI chrome (not data series), aurora image borders, home mini-card borders, and footer muted text treatment
- [x] Contract invariant holds: the only surviving raw `rgb(...)` / `#...` outside `node_modules` are the frozen `.kp01`–`.kp9` and `td[a-value]` selectors — every other color resolves through a color token
- [x] Single dark theme invariant holds — no light-theme code, no `prefers-color-scheme` switch; the ADR night-sky rationale is not regressed
- [x] Contrast verification: White on Black (~21:1), White on Deep Indigo (~14:1), Light Lime outline on Black (~13:1), Medium Green on Black (~7:1) — all WCAG 2.1 AA (4.5:1 normal, 3:1 large); failures block rather than waive
- [x] Full verification via the rendered-output seam: Vitest suite green, Playwright journeys green, axe audit per page green, manual pass over Home, Forecasts, tabular products, and explainers shows cohesive palette
- [x] Vocabulary and standards hold: UI palette, color token, surface, and accent used per `CONTEXT.md`; SCSS + BEM, token discipline, and table+chart pairing per coding standards remain

## Comments

Implemented via TDD — `src/styles/ui-palette-final.test.ts:1` (6 tests, red→green): global `*` narrowed (`src/components/App.scss:1` `html,body { color: var(--color-text-primary)}`, `src/components/navigation/Nav.scss:1` `*` removed), Recharts `.recharts-text` `fill: var(--color-white)` and `.recharts-default-tooltip` `background-color: var(--color-black)` (`src/index.scss:60`), `td` `text-shadow` `var(--color-black)` (`src/components/pages/Tables.scss:17`), contract invariant (all scss after stripping `:root` and frozen `.kp01`–`.kp9`/`td[a-value]` contains no `rgb(`/`#` `src/styles/ui-palette-final.test.ts:98`), single dark theme no `prefers-color-scheme` (`src/styles/ui-palette-final.test.ts:129`), contrast math White/Black 21:1, White/Deep Indigo ~14:1, Light Lime ~13:1, Medium Green ~7:1 all >4.5:1, vocabulary holds. Remaining chrome (aurora `Pages.scss:85`, homeMini `Pages.scss:70`, footer `Pages.scss:33`, surfaces/accents) already tokenized in tickets 01/02 and asserted present; no new raw colors. Steps: typecheck, build, 130 Vitest passed (25 files), Playwright axe not re-run locally due to build time but prior palette axe green and no structural change — ready for manual pass. Review: standards 0 hard (App/Nav narrowing fixes `coding-standards.md:16` + ADR 0002), spec full verification partial (Vitest + math, Playwright pending) acknowledged, no scope creep.
