# 01: Type tokens, breakpoints foundation, and migration of shared surfaces + home page

**What to build:** The complete type-token system lands and the chaser immediately sees it working across the app chrome, shared surfaces (buttons, tables, live panels, sources, pages) and the home page: every heading is sized by global element rules from semantic Type tokens, body text carries the body token, and the type scale steps at the canonical Breakpoints. The responsive mixin exists and is the only sanctioned way to write a media query in touched files.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The typography partial defines all font-size and paired line-height Type tokens on the root with the ADR-0009 values, including the md-breakpoint steps for body, lead, h1 and h2
- [ ] The breakpoints partial defines the canonical Breakpoint map (sm 480, md 810, lg 1100) and the `respond-to(sm|md|lg)` mixin, mobile-first min-width only; both partials reach the global entry stylesheet via `@use`
- [ ] Global h1–h4 element rules size headings from the tokens; the body element carries the body token
- [ ] All font-size and line-height declarations in the global entry stylesheet and the shared surface stylesheets (buttons, sr-only, skip-link, image modal, charts overrides, pages, tables, live panels, sources) use Type tokens; `em` sizes are collapsed to rem tokens
- [ ] All font-size and line-height declarations in every home-page component stylesheet use Type tokens; the three large data readouts remain as the documented literal exceptions, with the stray `!important` removed
- [ ] Per-component heading-size rules in migrated files are deleted in favor of the global rules
- [ ] Media queries in migrated files go through `respond-to`; the 480/481, 810/811 and near-1000 legacy pairs in migrated files fold into canonical Breakpoints
- [ ] Grep over migrated files shows zero raw rem font-size values and zero raw-pixel media queries outside the frozen readouts
- [ ] Playwright computed-style checks pass at a width below and above md (h1, h2 and body provably step); the existing a11y specs pass
- [ ] Visual pass over home, navigation chrome and shared surfaces at phone and desktop widths shows no layout breakage
