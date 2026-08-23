# 10 — Explainers page and tooltips

**What to build:** a plain-language explainers page at `/explainers` covering every concept the app displays — Kp index, A index, Radio flux, Geomagnetic activity, Geospace, Solar radiation storm, Radio blackout, Aurora forecast, and the product types — written in the glossary's vocabulary. Key terms across the app link or tooltip into the explainers so novices can learn in context.

**Blocked by:** 01 — Toolchain migration, 03 — 27-day outlook end-to-end

**Status:** ready-for-agent

- [x] `/explainers` lists one plain-language explanation per concept, vocabulary matching CONTEXT.md
- [x] Each product page links to the relevant explainer entries
- [x] Key terms render as accessible tooltips/linkable terms (keyboard-accessible, not hover-only)
- [x] The explainers page passes smoke test, Playwright journey, and axe audit

## Comments

- Implemented 2026-08-24. TDD red→green: `src/components/pages/explainers.test.tsx` (4 tests) and `src/components/explainers/product-glossary-integration.test.tsx` (7 tests) drove the slice. `src/components/explainers/GlossaryTerm.tsx` is the shared seam — a focusable `Link` to `/explainers#<id>` with dotted-underline styling and `focus-visible` ring (keyboard-accessible, not hover-only). `src/components/pages/explainers.tsx` (`main#explainers`) renders 17 glossary entries (8 measures/phenomena + 7 product types + Day summary/Rationale) with exact CONTEXT.md headings and anchor ids (`kp-index`, `a-index`, `radio-flux`, `geospace`, `aurora-forecast`, …), hash-scroll via `useLocation`, and BEM `explainers.scss`. Every product page (`27-day-outlook`, `daily-geomagnetic-indices`, `3-day-forecast`, `forecast-discussion`, `weekly-report`, `geophysical-alert`) adds a `__explainers` paragraph with `GlossaryTerm` links to its relevant entries; unit tests in each page's `*.test.tsx` now wrap with `MemoryRouter` to host the `Link`. Navigation (`Nav.tsx:38`) and routing (`App.tsx:12`) expose `/explainers`. Playwright: `e2e/explainers-a11y.spec.ts` covers render, `main` landmark axe audit (excluding shared shell), and cross-product glossary links; fixed incidental heading drift in `e2e/smoke.spec.ts:75` and `e2e/geophysical-alert-a11y.spec.ts:15` (h1 is “Geophysical Observations and Predictions”, matching the typed page and its Vitest). Suite green: typecheck, 94 Vitest, 18 Playwright (with retries).