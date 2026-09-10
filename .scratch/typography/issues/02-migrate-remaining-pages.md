# 02: Migrate navigation, shared components, conditions, webcams and forecasts onto type tokens

**What to build:** The rest of the app completes the migration: the navigation, shared components (collapsible panels, place finder, popovers, glossary, weather icon, moon chart, modals) and the conditions, webcams and forecast-product pages all render text from semantic Type tokens at the canonical Breakpoints. After this ticket, every text in the app is token-sized — a chaser sees one consistent type system on every page.

**Blocked by:** 01 (tokens foundation, shared surfaces and home page migrated).

**Status:** ready-for-agent

- [ ] All font-size and line-height declarations in navigation, shared-component, conditions, webcams and forecast-product stylesheets use Type tokens; `em` sizes collapse to rem tokens
- [ ] Per-component heading-size rules in migrated files are deleted in favor of the global h1–h4 rules
- [ ] Media queries in migrated files go through `respond-to`; the 419px and 900px legacy widths fold into canonical Breakpoints
- [ ] The frozen data-readout exception remains the only literal font-size value in the codebase (grep over all component stylesheets shows no other raw rem/em font-size and no raw-pixel media queries)
- [ ] Playwright computed-style checks and the existing a11y specs pass
- [ ] Visual pass over conditions, webcams, forecasts, about/sources/explainers and navigation at phone and desktop widths shows no layout breakage
