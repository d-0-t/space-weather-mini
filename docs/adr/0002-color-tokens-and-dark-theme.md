# 0002: Color tokens, dark-only theme, and Kp exception

We introduce CSS custom properties on `:root` in `src/index.scss` for the aurora-bird UI palette (White #FFFFFF, Black #000000, Deep Indigo #1C1455, Primary Dark Violet #7A16A5, Lighter Purple #9934C0, Dark Green #3B9C55, Medium Green #66C562, Light Lime #A0E35F) plus semantic aliases (`--color-bg-page`, `--color-bg-header`, `--color-bg-surface`, `--color-accent`, etc.) and a reusable `--gradient-card`. Page background stays Black with White text, header stays Deep Indigo, cards use a violet gradient (Primary Dark Violet → Deep Indigo), hovers use Lighter Purple, and accents use Medium Green for links/headings/glossary and Light Lime for focus outlines. Grays are remapped via `color-mix(in srgb, var(--color-deep-indigo) …, black)` with alpha for zebra striping; `Tables.scss` selectors `.kp01`–`.kp9` and `td[a-value]` are explicitly frozen and never variable-ized.

Why: a single dark theme preserves night-sky visibility ("if you look at it in the dark it will make it difficult for you to see the night sky"), so a light theme is out of scope; CSS custom properties on `:root` keep raw and semantic layers separate so the bird's violet gradient can be tuned in one place without touching components; freezing Kp-index and A-value coloring keeps storm semantics honest and avoids conflating data encoding with UI chrome.

**Status**: accepted

**Considered Options**:

- SCSS variables vs CSS custom properties — picked CSS props for runtime theming and because BEM/SCSS consumers already share a global `index.scss`.
- `color-mix` vs `rgba` grays — picked `color-mix` to keep the indigo hue warm; no fallback needed for this Vite static SPA.
- Gradient token vs inline `linear-gradient` — picked token (`--gradient-card`) for single-point tuning.
- Dual light/dark vs dark-only — picked dark-only per night-sky constraint; adding light later is a new ADR.

**Consequences**:

- Every non-data color MUST use a token; raw `rgb(...)`/`#...` outside `kp*`/`a-value` is a lint failure.
- `App.scss` `*{color:white}` is narrowed to respect accent tokens.
- Visual verification is one atomic PR touching `index.scss`, `Nav.scss`, `Pages.scss`, `Tables.scss` (non-Kp), `glossary-term.scss`, verified by Vitest + Playwright a11y specs and contrast checks (white on black 21:1, white on Deep Indigo ~14:1, Light Lime outline ~13:1 on black — all WCAG 2.1 AA).
