# UI Palette Recolor — Aurora Bird Tokens, Single Dark Theme

Status: ready-for-agent

## Problem Statement

The app works, but its UI color is scattered across dozens of hardcoded `rgb(...)` and `#...` values — warm grays for table chrome, `rgb(113, 255, 180)` mint for links, headings, glossary terms and focus rings, and a near-indigo header `#1e1958` that almost but doesn't quite match the new aurora-bird artwork that is already the app's logo and favicon. There is no single place to tune color, no semantic naming, and the old mint accent fights the bird's purples and greens. An ad-hoc recolor would either miss spots or silently break the data encoding where color *is* meaning — the Kp index storm-scale bands and the A-index cell values. Visitors checking the app in the dark (to actually see the night sky and aurora forecast) need a dark-only UI with reliable contrast, not a light theme or a brighter page.

## Solution

Introduce the aurora-bird **UI palette** as the app-wide color system and expose it once as **color tokens** on `:root`, then recolor the entire non-data UI through those tokens in a single atomic change. Page background stays Black, text stays White, the header stays Deep Indigo flat, **surfaces** (cards, dropdowns) use violet tones with a reusable violet gradient (Primary Dark Violet → Deep Indigo) and Lighter Purple Highlights for hover, and **accents** use Medium Green Midtones for links/headings/glossary terms and Light Lime Highlights for focus outlines and the skip link. Dark Green Shadows/Bases replaces gray borders. Warm grays for zebra striping become indigo-tinted alpha via `color-mix`. The Kp index presentation classes and the A-index `a-value` cells are explicitly frozen — every other color goes through a token. The app remains strictly single dark theme.

## User Stories

1. As a visitor checking the app at night, I want the page background to stay Black with White text, so that the screen doesn't wash out my night vision while I read the aurora forecast.
2. As a visitor, I want the header to use Deep Indigo, so that it matches the bird artwork already shown as the logo and favicon.
3. As a visitor, I want links, headings, and glossary terms to share one consistent accent green, so that I can recognize interactive and emphasized content without guessing.
4. As a visitor, I want focus outlines and the skip link to use a stronger Light Lime highlight, so that I can see where I am when tabbing across a dark page.
5. As a visitor, I want cards and articles to share a subtle violet gradient, so that the app feels like the bird's wing rather than a flat gray box.
6. As a visitor, I want navigation hover and dropdown highlights to use the same lighter purple, so that interaction feedback is predictable.
7. As a visitor, I want borders and subtle dividers to use the muted dark green rather than neutral gray, so that the whole UI feels cohesive with the palette.
8. As a visitor, I want zebra-striped tables to keep alternating rows but with an indigo-tinted tint, so that rows remain scannable without cold grays.
9. As a visitor, I want all tables other than the data-encoded cells to follow the new UI palette, so that the tables feel like part of the app rather than legacy chrome.
10. As a visitor reading a space weather product, I want the Kp index storm-scale colors to stay exactly as they are, so that I can trust that severe storms still look severe and quiet days still look quiet.
11. As a visitor reading the 27-day outlook or daily geomagnetic indices, I want the A-index cell colors to stay exactly as they are, so that the A index retains its established meaning separate from UI chrome.
12. As a novice, I want glossary terms in the text to use the same accent treatment everywhere, so that I know they are tappable and linked to the explainers page.
13. As a screen-reader user, I want the recolor to change nothing about heading order, landmark structure, or table semantics, so that my navigation doesn't break.
14. As a keyboard user, I want focus indicators to remain 3px solid, highly contrastive, and visible on every interactive element, so that I can operate the app without a mouse.
15. As a motion-sensitive user, I want the recolor to respect prefers-reduced-motion as before, so that no new animation or transition is introduced with the palette change.
16. As a visitor on any product page, I want the product's issued-time and author line to remain visible and legible against the new backgrounds, so that I can judge freshness.
17. As a visitor, I want the aurora forecast images to remain clearly bordered and distinguishable against the new card surfaces, so that the images don't blend into the background.
18. As a developer, I want every non-data color to come from a named color token, so that I can tune the palette in one place without hunting hex values.
19. As a developer, I want raw palette colors and semantic aliases kept separate, so that I can remap "accent" without touching "medium green" and vice versa.
20. As a developer, I want the violet card gradient defined once as a token, so that tuning the gradient propagates to every card.
21. As a developer, I want the Kp index and A-value selectors to be the only allowed hardcoded colors, so that a future lint rule can catch stray hex or rgb.
22. As a developer, I want the existing global stylesheet to be the single source of truth for tokens, so that no component needs to import a separate tokens file.
23. As a maintainer, I want the single-dark-theme decision documented with its night-sky rationale, so that no one later adds a light theme without revisiting the ADR.
24. As a maintainer, I want the vocabulary of color token, surface, accent, and UI palette used consistently in code, copy, and docs, so that one term means one thing.
25. As a reviewer, I want the entire recolor to land as one atomic change with no layout or parser modifications, so that I can review color in isolation.

## Implementation Decisions

- **UI palette (raw) — eight colors from the bird**: White #FFFFFF, Black #000000, Deep Indigo #1C1455, Primary Dark Violet #7A16A5, Lighter Purple Highlights #9934C0, Dark Green Shadows/Bases #3B9C55, Medium Green Midtones #66C562, Light Lime Highlights #A0E35F. These are the only raw values; everything else aliases them.

- **Color token layer on `:root` in the global stylesheet**: raw tokens (`--color-white`, `--color-deep-indigo`, etc.) plus semantic aliases (`--color-bg-page`, `--color-text-primary`, `--color-text-inverse`, `--color-bg-header`, `--color-bg-surface`, `--color-bg-surface-strong`, `--color-accent`, `--color-accent-strong`, `--color-border-muted`) and one reusable gradient token (`--gradient-card: linear-gradient(180deg, var(--color-primary-violet), var(--color-deep-indigo))`). Components never use raw hex or rgb directly.

- **Single dark theme — no light variant**: page background is Black, text is White, header is flat Deep Indigo. A light theme is explicitly out of scope; the ADR records the night-sky rationale verbatim. Adding a light theme later requires a new ADR.

- **Semantic mapping (settled in grilling)**:
  - Page chrome: background Black, text White.
  - Header: flat Deep Indigo (the existing header hue is tuned to the exact token).
  - Surfaces: Primary Dark Violet base, Lighter Purple Highlights for hover/active/dropdown highlight, Deep Indigo for gradient end stop. Card/article backgrounds use the gradient token; header stays flat; nav hover uses flat lighter purple (no gradient on hover).
  - Accents: Medium Green for links, headings, and glossary terms (calmer for reading); Light Lime for all focus outlines, the skip link, and focus-visible states (maximum pop, ~13:1 on Black).
  - Borders and subtle dividers: Dark Green (muted), replacing all neutral grays.
  - Zebra striping: `color-mix(in srgb, var(--color-deep-indigo) 12%, black)` and `18%` for alternating rows, preserving the dark page but warming the gray.

- **Gray elimination**: every hardcoded gray outside the frozen data selectors is remapped. That includes table borders, header cell backgrounds, alternating row backgrounds, hover grays on tables, nav dropdown backgrounds and dashed dividers, card borders, aurora image borders, footer muted text treatment, and chart axis/tooltip fills that are UI chrome rather than data encoding. No plain `rgb(129,129,129)` etc. remains outside the two frozen selectors.

- **Frozen data encoding — hard boundary**: the Kp index presentation range classes (the `.kp01` through `.kp9` band classes generated by the Kp classification helper) and the A-index value selector (`td[a-value]`) are frozen byte-identical. They are never variable-ized and are the only place raw `rgb(...)` survives. All other table chrome (`th`, `tr:nth-child`, `td[cellType]`, row hover outlines, header widths) goes through tokens.

- **Global text color narrowing**: the broad `* { color: white }` rule is narrowed so that accent elements can actually show the accent token while non-accent text remains White. Default text inheritance is otherwise untouched.

- **Modules touched (presentation only, no data/logic changes)**:
  - The global stylesheet (where `:root` tokens and gradient live, plus focus-visible and skip-link outlines, Recharts tooltip/background chrome, and sr-only utilities).
  - The navigation component's styling (header background, nav item hover, dropdown background and dividers, dropdown item hover).
  - The page container styling (heading colors, link colors, card/article gradient, footer text, aurora image borders, home card borders).
  - The tabular styling (all non-frozen table chrome: borders, header cells, zebra rows, hover states, subheader cells).
  - The glossary term styling (dotted underline base, hover/focus background and outline using accent tokens).
  - The app shell styling (any remaining global text color overrides).

- **No new assets or routes**: the existing bird artwork already served from the public assets folder and used as favicon and header logo is reused; no new logo file, no new route, no new product.

- **Increment is one atomic change**: recolor lands as a single change with no layout, typography, spacing, or parser modifications, so visual review is pure color and prior behavioral tests remain green.

- **Respect for existing ADRs and standards**: ADR-0001 (client-side only, no backend, static deploy, localStorage-only preferences) is unchanged. ADR-0002 (this palette/token/dark-theme decision) is the normative record and is referenced by the spec. SCSS + BEM naming, TypeScript strict, and Recharts-always-paired-with-table accessibility rules from the coding standards remain in force; the former sole-token rule (`.kp01`–`.kp9` as tokens) is extended to allow `:root` color tokens for non-data UI while keeping the Kp classes as the data-token mechanism.

## Testing Decisions

- **What makes a good test**: assert external, user-observable behavior, not implementation details. For this feature "behavior" is rendered appearance and accessibility: the right elements expose the right computed colors and contrast, and landmarks/headings/tables/charts remain structurally unchanged. No snapshot of SCSS, no assertion on internal helper functions, no parser-level test (parsers are untouched).

- **Primary seam — the rendered-output seam (proposed, one seam ideal)**: the highest seam that covers everything is the DOM + computed styles seam. Every color eventually resolves to a computed `background-color`/`color`/`outline-color`/`border-color` on a rendered element, so a single seam — rendering the app's components in a jsdom environment and asserting computed styles, plus running Playwright with axe on the real browser — covers the whole increment with the fewest seams. This mirrors prior art where component smoke tests assert "renders, key landmarks present" rather than unit-testing style helpers.

- **Modules exercised through that seam**:
  - Navigation (header background, logo + title, top-level links, Forecasts disclosure button and submenu items, hover/focus states).
  - Page containers (headings, links, articles/cards with gradient, footer, aurora image wrappers, home mini-cards).
  - Tabular chrome (table borders, header cells, zebra rows, subheader cells, hover outlines — but explicitly *not* the frozen Kp and A-value cells, which are asserted to remain unchanged).
  - Glossary terms (default dotted underline in accent color, hover solid underline + tinted background, focus outline in strong accent).
  - Global affordances (skip link colors, focus-visible outlines on anchors/buttons/inputs, Recharts axis text fill and tooltip background where it is UI chrome).

- **Prior art reused**:
  - Vitest component smoke tests (e.g. the existing app-shell and navigation tests that assert rendering and landmarks) — extend with style assertions that elements use tokens (e.g. header computes to Deep Indigo, links to Medium Green) rather than introducing a new harness.
  - Playwright journeys plus axe audit per page (existing `e2e/*-a11y.spec.ts` suite) — re-run unchanged to confirm WCAG 2.1 AA still holds after remapping; any contrast failure is fixed in-place rather than by weakening the palette.
  - Legacy parser-contract tests are *not* extended — parsers are out of scope for a recolor, confirming the seam choice.

- **Contrast verification**: white on Black (21:1), white on Deep Indigo (~14:1), and Light Lime focus outline on Black (~13:1) are the critical pairs; Medium Green on Black (~7:1) for links is also checked. All exceed WCAG 2.1 AA (4.5:1 normal, 3:1 large). Failures block the change rather than being waived.

- **No visual snapshot baseline required**: because layout/spacing doesn't change, the existing a11y + smoke suite plus a manual pass over Home, Forecasts, tables, and explainers is the sufficient gate for this slice.

## Out of Scope

- Light theme, `prefers-color-scheme` switching, or any theming beyond the single dark theme — deferred per ADR-0002's night-sky rationale.
- Any change to the Kp index band colors (`.kp01`–`.kp9`) or the A-index `a-value` cell colors — frozen by design.
- Layout, typography, spacing, or responsive changes — recolor only.
- New logo artwork or asset pipeline changes — the bird is already in place as favicon and public asset.
- Parser, data-fetching (TanStack Query), routing, or product model changes.
- Chart series data colors where color encodes data (Recharts lines remain shape-differentiated per coding standards).
- New tests for parsers or data contracts.
- Backend, proxy, caching, push notifications, threshold alerts, or user accounts (ADR-0001 remains).
- Editing NOAA prose, localization, or historical data beyond current products.

## Further Notes

- **Vocabulary is CONTEXT.md**: use **UI palette**, **color token**, **surface**, **accent**, **Kp index**, **A index**, **space weather product**, **aurora forecast**, **day summary**, **rationale** exactly as defined; the `_Avoid_` lists are normative for copy and code.
- **ADRs**: ADR-0001 (client-side only) constrains the architecture and stays in force; ADR-0002 is the normative record for this palette/token/dark-theme decision and should be read alongside the spec — the spec implements ADR-0002.
- **Coding standards**: SCSS + BEM, token discipline (no raw hex outside frozen selectors), semantic tables + Recharts-always-paired, WCAG 2.1 AA plus skip-link/focus-visible/prefers-reduced-motion, and Vitest + Playwright coverage all remain in force.
- **Seam confirmation**: the rendered-output seam (Vitest computed styles + Playwright + axe) was chosen as the highest single seam that covers the feature; if reviewers prefer an additional dedicated token-presence lint (e.g. a stylelint rule flagging raw `rgb(` outside the two frozen selectors), that can be added as a follow-up without expanding the spec's test scope.
