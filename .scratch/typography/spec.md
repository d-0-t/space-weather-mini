# Spec: Standardized typography — stepped type scale with semantic type tokens

**Status:** ready-for-agent

## Problem Statement

The app's text sizing has drifted: 19 distinct hardcoded rem/em values (84 declarations across the component stylesheets) sit one micro-step apart (0.7 vs 0.75, 0.85 vs 0.9) with no system, headings are sized ad hoc per component or left to browser defaults, and media queries use eight ad-hoc widths (419, 480/481, 810/811, 900, ~1000, 1100) that don't compose. A chaser moving between pages sees subtly different text sizes for the same role of text; a maintainer adding a component has no vocabulary to pick a size from and invents yet another value.

## Solution

A typography system, decided in ADR-0009 and extending the color-token approach of ADR-0002: semantic **Type token** roles (caption, small, body, lead, h1–h4), each a paired font-size and line-height custom property, stepping at canonical **Breakpoints** (sm 480px, md 810px, lg 1100px, mobile-first). Headings h1–h4 are sized once by global element rules from the tokens; the body element carries the body token so all text inherits the scale; a `respond-to` mixin is the only way to write a media query. All existing declarations migrate onto the tokens in one coordinated effort.

## User Stories

1. As a chaser on a phone, I want headings sized for a small viewport, so titles don't crowd out the forecast content.
2. As a chaser on a tablet or desktop, I want h1 and h2 to step up at the md breakpoint, so the page reads as a display page rather than a shrunken one.
3. As a chaser, I want body text to be the same size on every page, so the app reads as one product instead of six.
4. As a chaser, I want captions (timestamps, attributions, source lines) at one consistent size, so small print is small everywhere for the same reason.
5. As a chaser, I want line-heights matched to each text role, so prose and tables are readable at each size rather than randomly spaced.
6. As a chaser who enlarges browser text, I want all sizing in rem against the real root, so my zoom preference scales every part of the app proportionally.
7. As a chaser using a screen reader, I want the heading structure and semantic order untouched by the restyling, so my navigation is unchanged.
8. As a chaser on a mid-size window, I want layout media queries to fire at the same widths the type steps at, so text and layout never disagree about where "tablet" starts.
9. As a maintainer, I want semantic role names instead of magic numbers, so `font-size: var(--font-size-small)` tells me what the text *is*.
10. As a maintainer, I want each type role defined in one place, so tuning the h1 size for all pages is a one-line change.
11. As a maintainer, I want a canonical breakpoint map, so new components never invent a 419px-style width again.
12. As a maintainer, I want a `respond-to` mixin that only emits min-width queries, so the codebase stays mobile-first without discipline depending on memory.
13. As a maintainer, I want raw font-size values and raw pixel media queries to be conventionally forbidden, so the system can't silently re-drift.
14. As a maintainer, I want the three large data readouts deliberately kept as literal one-offs, so the storm-display numbers keep their tuned sizes independent of heading roles.
15. As a maintainer adding a page, I want headings sized by global rules, so a new page needs zero sizing CSS — just semantic `<h1>`–`<h4>`.
16. As an AFK agent implementing future components, I want Type token and Breakpoint defined in the glossary and cited in the coding standards, so new code reaches for the system instead of eyeballing values.
17. As a maintainer reviewing this work, I want computed-style tests at two viewports, so the md step provably steps and regressions surface in CI.

## Implementation Decisions

- **Stepped, not fluid** (ADR-0009): sizes change at breakpoints via standard media queries; no `clamp()`.
- **Semantic role naming** over a numbered scale: caption, small, body, lead, h1, h2, h3, h4 — consistent with the semantic color aliases of ADR-0002.
- **Paired line-height tokens**: each font-size role has a matching line-height custom property, applied as two declarations (no `font:` shorthand).
- **Scale values** (mobile → md step): caption 0.75rem, small 0.85rem, body 0.95→1rem, lead 1.1→1.15rem, h4 1rem, h3 1.25rem, h2 1.5→1.75rem, h1 2→2.5rem.
- **Canonical breakpoints**: sm 480px, md 810px, lg 1100px, mobile-first (min-width) only, behind a `respond-to(sm|md|lg)` mixin over a SCSS breakpoint map; raw pixel values in media queries are forbidden.
- **Global heading sizing**: one set of h1–h4 element rules in the typography partial; the per-component heading-size rules are deleted (no h5/h6 exist in the markup).
- **Body element on the body token**, so text that never declared a size inherits the scale (this is the "absorbs 1rem" row of the confirmed table).
- **Two dedicated SCSS partials** (typography, breakpoints) imported via `@use` from the global entry stylesheet — the codebase's first `@use`-based partials, setting the precedent for future token files.
- **Frozen exception**: the three large data readouts (aurora temperature, live-panel value, webcam count) remain literal rem values outside the system, like the frozen Kp data classes of ADR-0002; their stray `!important` is removed.
- **Migration shape**: expand–contract — land the complete token system first, migrate component stylesheets in two context-window-sized batches, then a contract sweep that greps for stragglers. The whole sequence is one coordinated effort, per the big-bang migration decision.

## Testing Decisions

- A good test asserts only external behavior: **computed styles of rendered pages** (h1–h4, body, captions) at widths below and above the md breakpoint, proving the tokens are applied and the step actually steps — never tests of SCSS internals.
- The seam is the existing one: **Playwright against the rendered app at multiple viewport widths**, plus the existing Vitest a11y specs as regression cover for structure/contrast.
- Prior art: the existing Vitest + Playwright accessibility specs referenced by ADR-0002.
- Convention compliance ("no raw rem font-sizes, no raw px media queries outside the frozen exceptions") is verified by grep as acceptance criteria, not automated tests — mirroring how ADR-0002 handles its color-token rule.
- Visual verification: one pass per page (home, conditions, webcams, forecasts, about/sources/explainers) at phone and desktop widths.

## Out of Scope

- Spacing, radius, or any non-typography tokens (line-height rides along only as a paired token).
- Font-family changes; the system stack stays as-is.
- Fluid/`clamp()` scaling, h5/h6 styling (none exist), a light theme, or a 62.5% root-font trick.
- Retuning the three frozen readouts beyond removing the stray `!important`.

## Further Notes

- Vocabulary: **Type token** and **Breakpoint** are defined in CONTEXT.md under Presentation; the decision record is ADR-0009 (accepted 2026-09-10).
- ADR-0002's documented `--color-status-red` token is missing from the codebase — unrelated drift, tracked separately.
- The `em`-based font-size outliers collapse to rem tokens; all sizing is rem against the 16px root.
