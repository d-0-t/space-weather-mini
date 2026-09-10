# 0009: Stepped type scale, semantic type tokens, and canonical breakpoints

We replace 19 ad-hoc rem/em font-size values (84 declarations across 42 SCSS files) with semantic type tokens — CSS custom properties on `:root` in a dedicated `src/styles/_typography.scss` partial: `--font-size-caption/small/body/lead/h1/h2/h3/h4`, each with a paired `--line-height-*` token. Sizes step at breakpoints instead of scaling fluidly (no `clamp()`): caption 0.75rem, small 0.85rem, body 0.95→1rem, lead 1.1→1.15rem, h4 1rem, h3 1.25rem, h2 1.5→1.75rem, h1 2→2.5rem, with only the body/lead/h1/h2 steps applied at the `md` breakpoint. Headings are sized once by global `h1`–`h4` element rules in the typography partial; the nine per-component heading-size rules are deleted (no `h5`/`h6` exist in the markup). A canonical breakpoint map — sm 480px, md 810px, lg 1100px, mobile-first `min-width` only — lives in `src/styles/_breakpoints.scss` behind a `respond-to(sm|md|lg)` mixin, and the 17 existing ad-hoc media queries (419, 480/481, 810/811, 900, ~1000, 1100) fold into it. Both partials are the codebase's first `@use`-based files, wired in from `src/index.scss`.

Why: typography had the same drift color had before ADR-0002 — near-duplicate values one step apart (0.7 vs 0.75, 0.85 vs 0.9) with no system, and breakpoints duplicated as both 480/481 and 810/811 pairs. Semantic role names match the existing semantic color aliases and map onto the heading elements the markup already uses; stepped values over `clamp()` keep sizes predictable and debuggable at exact breakpoints; the big-bang migration avoids an indefinite two-system state. The three large data readouts (aurora temperature `AuroraNow.scss`, live-panel value `live-panels.scss`, webcam count `webcams.scss`) stay literal one-offs — deliberately outside the type system, like the frozen `.kp01`–`.kp9` data classes in ADR-0002.

**Status**: accepted (2026-09-10)

**Considered Options**:

- `clamp()` fluid scaling vs stepped breakpoints — picked stepped: predictable jumps, per-step tuning, and it matches how the layout already compresses at breakpoints.
- Numbered scale (`--font-size-1`…`7`) vs semantic roles — picked semantic roles, consistent with the semantic color aliases and self-documenting at point of use.
- New `--font-size-display` token for the big readouts vs literal one-offs — picked one-offs: three declarations, no reuse, semantically data not headings.
- SCSS variables for sizes vs CSS custom properties — picked custom properties to extend ADR-0002's single token layer; SCSS variables appear only where compile-time is required (the breakpoint map and mixin).

**Consequences**:

- Every `font-size` declaration MUST use a type token, except the three frozen readout literals; new ad-hoc rem values are a lint failure by convention, mirroring ADR-0002's color-token rule.
- New media queries MUST go through `@include respond-to(sm|md|lg)`; component files that need it `@use "../../styles/breakpoints" as *;`. Raw pixel values in media queries are forbidden.
- Body text does not scale across viewports by design; only body/lead/h1/h2 step at `md`. Mobile sizes are the baseline.
- All type sizing is rem against the 16px root (no 62.5% root hack); the `em`-based outliers and the `!important` in `webcams.scss` are removed in the migration.
- Migration is one atomic pass with a visual check per page (home, conditions, webcams, forecasts, about/sources/explainers) plus the existing Vitest + Playwright a11y specs.
