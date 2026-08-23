# Modern Stack Migration

Status: ready-for-agent

## Problem Statement

The app is a working NOAA SWPC display, but it is built on a deprecated toolchain (Create React App, React 18, TypeScript 4.9) with untyped, DOM-coupled parsers that return raw HTML strings rendered via `dangerouslySetInnerHTML`. Domain vocabulary is inconsistent (`GeoAlert`/`wwv`, `geospace`/`geomagnetic`, the `regionale` typo), dead and orphaned components linger, there is no test coverage, and accessibility is unverified. The result: the code cannot safely evolve, data cannot be charted or queried (it is HTML, not data), and the app is a mirror of NOAA pages rather than something useful on its own.

## Solution

A modern, typed, accessible display app on the same static-deploy architecture (no backend — ADR-0001): Vite + React 19 + strict TypeScript, TanStack Query data fetching, a pure `string → Product` parser layer with one typed model per product, semantic tables with Recharts visualisations beside them, SCSS + BEM styling with the `.kp01`–`.kp9` color classes preserved as the token mechanism, WCAG 2.1 AA plus pragmatic extras, Vitest + Playwright test coverage, and a documented coding standard enforcing all of it.

The app gains two new surfaces: a current-conditions dashboard at `/` and a plain-language explainers glossary at `/explainers`. Dead code is deleted; the six product pages migrate as-is with typed data models.

## User Stories

1. As a visitor, I want the app to load quickly from a static host, so that I can check space weather conditions without signup or backend dependency.
2. As a visitor, I want a dashboard at `/` showing today's Kp and A indices, the latest geophysical alert, the aurora forecast images, and per-product "as of" times, so that I can assess current conditions in one glance.
3. As a visitor, I want each product page to show when its data was issued, so that I can judge how fresh the information is.
4. As a visitor, I want to manually refresh a product's data, so that I can pull the newest NOAA update without reloading the page.
5. As a visitor, I want the tabular products (27-day outlook, daily geomagnetic indices, 3-day forecast probabilities) as real semantic tables, so that I can read exact numbers.
6. As a visitor, I want a chart next to each table (Kp history timeline, 27-day radio flux/A index trend, storm-probability bars), so that I can see trends the table hides.
7. As a visitor, I want to open any product from the navigation the way I do today, so that the six NOAA products remain reachable at familiar routes.
8. As a novice, I want plain-language explanations of Kp index, A index, radio flux, solar radiation storms, radio blackouts, and aurora forecasts, so that I can understand what the numbers mean.
9. As a novice, I want an explainers page listing every concept the app displays, so that I can learn the vocabulary in one place.
10. As a novice, I want tooltips on key terms throughout the app linking into the explainers page, so that I can learn in context.
11. As a screen-reader user, I want every chart paired with the table carrying the same data, so that I get the numbers the chart shows.
12. As a screen-reader user, I want the app to meet WCAG 2.1 AA, so that all content and controls are accessible.
13. As a keyboard user, I want a skip link, visible focus indicators, and logical tab order, so that I can navigate without a mouse.
14. As a motion-sensitive user, I want `prefers-reduced-motion` respected, so that animations don't trigger vestibular issues.
15. As a visitor with a flaky connection, I want data fetches to retry and fail gracefully with an understandable error state, so that I know what happened and can retry.
16. As a developer, I want every parser to be a pure `string → Product` function with a typed model per product, so that parsing is testable and data is chartable.
17. As a developer, I want TypeScript strict mode, so that the type system catches mistakes at compile time.
18. As a developer, I want module-level variables documented where non-obvious, as a standard, so that the codebase is legible to agents and humans alike.
19. As a developer, I want the vocabulary of the code, the types, and the user-facing copy to follow CONTEXT.md, so that one term means one thing everywhere.
20. As a developer, I want the `.kp01`–`.kp9` color classes preserved as the design-token mechanism, so that storm-scale coloring stays consistent.
21. As a developer, I want Vitest parser tests pinned to real NOAA fixtures, so that format changes are detected instead of silently misrendered.
22. As a developer, I want Playwright journeys and an axe audit per page, so that accessibility regressions surface in CI.
23. As a developer, I want dead code (the test page, the unfinished table maker, the orphaned Kp test table, the orphaned forecast index) deleted, so that the codebase reflects what the app is.
24. As a maintainer, I want the coding standard documented and referenced from AGENTS.md, so that future contributors and agents follow it.
25. As a maintainer, I want the migration to proceed incrementally — tooling first, then products one at a time — so that the app stays deployable at every step.
26. As a visitor familiar with NOAA, I want the user-facing labels to keep NOAA's names (e.g. "Geophysical Alert Message"), so that I can map the app to the sources I know.

## Implementation Decisions

- **Toolchain**: migrate from Create React App to Vite (React plugin, dart-sass for SCSS). React 19, TypeScript `strict: true`, React Router v7 in library mode with the existing route paths preserved. The test runner becomes Vitest; Playwright is added for E2E. Migration is incremental: tooling and build first, then products one at a time, keeping the app deployable at each step.
- **Data layer**: TanStack Query with one query key per product URL. Fetch on page mount; a manual refresh affordance per product; stale-while-revalidate on refocus is acceptable. No polling timers. Every product display shows an "As of" timestamp derived from the product's `issued` metadata. Errors render an understandable message with a retry action. Data continues to be fetched directly from NOAA SWPC — no proxy (ADR-0001).
- **Parser layer**: every product gets a pure `string → Product` parser. Tabular products — 27-day outlook, daily geomagnetic indices, 3-day forecast probabilities — get full structured models (typed rows, per-station index data, probability tables). Narrative products — forecast discussion, weekly report, geophysical alert — get light models: `issued` timestamp plus structured sections, prose preserved as text. Parsers never touch the DOM; rendering is separate.
- **Rendering**: semantic HTML tables for all tabular products, styled with SCSS + BEM (`block__element--modifier`, e.g. `list__item__img`; nesting only within BEM structure). Recharts visualisations (Kp history timeline, 27-day radio flux/A index trend, storm-probability bars) render beside the tables carrying the same data — the table is the accessibility source of truth. The `.kp01`–`.kp9` color classes are preserved as the sole design-token mechanism; no inline hex in components.
- **Page structure**: `/` becomes a current-conditions dashboard (today's Kp and A indices, latest geophysical alert, aurora forecast images, per-product as-of times). `/forecasts/*` keeps the six product pages. `/explainers` hosts the glossary of plain-language explanations; tooltips on key terms link into it. The orphaned forecast index, the test page, the unfinished table maker, and the Kp test table are deleted, not ported.
- **Accessibility**: WCAG 2.1 AA plus skip link, visible focus, `prefers-reduced-motion`. Playwright runs an axe audit per page.
- **Vocabulary**: code, types, and user-facing copy follow CONTEXT.md. The geophysical alert product is named `geophysical-alert` internally with the NOAA label "Geophysical Alert Message" in the UI; "Regional text" replaces `regionale`; `geospace` is used only for the discussion section, never as a synonym for geomagnetic activity.
- **Standards**: the conventions (TypeScript strict, documented variables, SCSS + BEM, token classes, test stack, accessibility bar) live in `docs/agents/coding-standards.md`, referenced from AGENTS.md.

## Testing Decisions

- **Good tests**: assert external behavior only. A parser test feeds raw NOAA fixture text and asserts the typed product that comes out — never internal helper functions. A component test asserts rendered output (landmarks, key content), not component internals.
- **Primary seam — the parser boundary**: every product transformation flows through `string → Product`, so the parser layer is the one seam worth testing deeply. Fixtures are real NOAA text, fetched once and checked in, so NOAA format changes fail tests loudly instead of silently misrendering. No snapshot tests of parser output.
- **Modules tested**: all six product parsers (unit), the dashboard and each product page (component smoke: renders, key landmarks present), and each page via Playwright (render journey with live data + axe audit).
- **Prior art**: the repo has `setupTests.js` and Testing Library configured from CRA; there are no existing meaningful tests, so these are the first — the parser tests establish the pattern the coding standard then requires.

## Out of Scope

- Threshold alerts / browser notifications (deferred — ADR-0001 keeps alerting local-only, and the feature was not selected).
- Polling or push-based freshness (fetch on mount + manual refresh only).
- Any backend, proxy, cache layer, or user accounts.
- Historical data beyond what NOAA's products already provide (e.g. the 30-day daily indices table).
- Editing or composing NOAA content, or localization.
- Dark mode and theming beyond the existing storm-scale colors.

## Further Notes

- Vocabulary is settled in `CONTEXT.md` (Geospace, Geomagnetic activity, Geophysical alert, Regional text, product nouns, `_Avoid_` lists) and must not drift during implementation.
- ADR-0001 (client-side only architecture) constrains the data layer: no server, localStorage-only preferences.
- `docs/agents/coding-standards.md` is normative for this work; AGENTS.md points at it.
- The dashboard and explainers pages are new surfaces; the six product pages are migrations of existing behavior onto typed data.