# 03: Narrow global text override, recolor remaining chrome, and verify contract

**What to build:** A visitor sees the final sweep — no stray hardcoded color survives outside data encoding, accents actually show (global text no longer forces white over everything), any remaining chrome (app shell overrides, Recharts axis text and tooltip background where it is UI chrome, aurora image and home mini-card borders) is on tokens, and the whole app passes contrast and a11y verification in one green contract step.

**Blocked by:** 02: Recolor tabular chrome while preserving Kp and A-value encoding

**Status:** ready-for-agent

- [ ] The global `* { color: white }` override is narrowed so White remains the default text color but Medium Green accents (links, headings, glossary terms) and Light Lime focus actually render
- [ ] Remaining chrome now on tokens: app shell text overrides, Recharts axis text fill and tooltip background where it is UI chrome (not data series), aurora image borders, home mini-card borders, and footer muted text treatment
- [ ] Contract invariant holds: the only surviving raw `rgb(...)` / `#...` outside `node_modules` are the frozen `.kp01`–`.kp9` and `td[a-value]` selectors — every other color resolves through a color token
- [ ] Single dark theme invariant holds — no light-theme code, no `prefers-color-scheme` switch; the ADR night-sky rationale is not regressed
- [ ] Contrast verification: White on Black (~21:1), White on Deep Indigo (~14:1), Light Lime outline on Black (~13:1), Medium Green on Black (~7:1) — all WCAG 2.1 AA (4.5:1 normal, 3:1 large); failures block rather than waive
- [ ] Full verification via the rendered-output seam: Vitest suite green, Playwright journeys green, axe audit per page green, manual pass over Home, Forecasts, tabular products, and explainers shows cohesive palette
- [ ] Vocabulary and standards hold: UI palette, color token, surface, and accent used per `CONTEXT.md`; SCSS + BEM, token discipline, and table+chart pairing per coding standards remain

