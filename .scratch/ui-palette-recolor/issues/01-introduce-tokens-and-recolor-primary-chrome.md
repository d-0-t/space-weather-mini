# 01: Introduce UI palette tokens and recolor accents, surfaces, and navigation

**What to build:** A visitor sees the app's primary chrome on the new aurora-bird palette in one demoable increment — page stays Black with White text, header is flat Deep Indigo, cards and articles use the violet gradient (Primary Dark Violet → Deep Indigo), links, headings and glossary terms share Medium Green, and every focus-visible outline plus the skip link pops in Light Lime. Navigation hover and the Forecasts disclosure hover in Lighter Purple, dropdowns sit on Primary Dark Violet with Dark Green dividers, and no primary chrome still shows the old mint `rgb(113, 255, 180)` or neutral gray.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] `:root` in the global stylesheet exposes the eight raw UI palette colors (White, Black, Deep Indigo #1C1455, Primary Dark Violet #7A16A5, Lighter Purple Highlights #9934C0, Dark Green #3B9C55, Medium Green #66C562, Light Lime #A0E35F) plus semantic aliases for background, surface, accent, accent-strong, border-muted, text-primary/inverse, and a reusable gradient token for cards
- [x] Links, headings, and glossary terms render in the accent (Medium Green) rather than the old mint, with the glossary term's dotted underline and its hover/focus tint using the same accent family
- [x] Every focus-visible outline and the skip link render as 3px solid in the strong accent (Light Lime) with AA contrast on Black and Deep Indigo
- [x] Header renders flat Deep Indigo; card/article surfaces render via the gradient token; footer and home wrappers no longer use `rgb(27,27,27)`/`rgb(8,8,8)` grays
- [x] Top nav items and the Forecasts disclosure hover/active render in Lighter Purple Highlights; dropdown background renders in Primary Dark Violet with Dark Green dashed dividers; dropdown item hover uses the strong surface highlight
- [x] No new route, asset, parser, or data-fetch change — the existing bird logo and favicon are reused
- [x] Tests via the rendered-output seam: component smoke for navigation and page containers asserts computed colors come from tokens, and Playwright axe per page still passes for the recolored surfaces

## Comments

Implemented via TDD. Added `src/styles/ui-palette-tokens.test.ts:1` (6 tests, all green) as the token contract; existing suite remains at pre-existing 3 failures (Home + app-shell, verified via stash on main before changes) — no new regressions. Build and typecheck clean. Tokens live on `:root` in `src/index.scss:1`, gradient `--gradient-card` centralized, all old mint `rgb(113, 255, 180)` removed from `index.scss`, `Pages.scss`, `Nav.scss`, `glossary-term.scss`. Primary chrome now demoable in isolation; tabular chrome deferred to ticket 02.

