# 11 — App shell accessibility

**What to build:** the application shell meets the accessibility bar: a skip-to-content link, visible focus indicators everywhere, `prefers-reduced-motion` respected for any animation, logical heading order and landmarks across the shell (navigation, main, footer), and an axe audit passing on the shell itself.

**Blocked by:** 01 — Toolchain migration, 03 — 27-day outlook end-to-end

**Status:** ready-for-agent

- [x] A skip link is the first focusable element and moves focus to main content
- [x] All interactive elements have visible focus indicators
- [x] Animations respect `prefers-reduced-motion`
- [x] The shell (navigation + footer on every page) has correct landmarks and heading order
- [x] Shell-level axe audit passes
- [x] The navigation menu can be operated by keyboard and not just mouse hover (currently failing submenu of "Forecasts & Discussions").

## Comments

- Implemented 2026-08-24. TDD red→green: `src/components/app-shell.test.tsx` (4 tests: skip link first-focusable, banner/nav/main/contentinfo landmarks, h1 inside main, no `<center>`) and `src/components/navigation/Nav.test.tsx` (3 tests: disclosure button aria-expanded/controls, keyboard focus/Enter/Tab/Escape cycle, valid `<li><a>` markup) drove the slice. `src/index.tsx:22-29` now renders `<a class="skip-link" href="#main-content">` + `<header id="header">` / `<nav aria-label="Primary">` / `<main id="main-content" tabindex="-1">` / `<footer id="footer">` inside `.app-shell`, removing deprecated `<center>`; `src/components/navigation/Nav.tsx:13-101` replaces the invalid `<Link><li>` / hover-only `.dropdown:hover` with semantic `<li><Link>` + disclosure `<button aria-expanded aria-haspopup aria-controls>` and `dropdown--open` / `:focus-within` CSS (`src/components/navigation/Nav.scss:97-99`), handling `Escape` to return focus to the trigger. `src/components/footer/Footer.tsx:4` is now `<footer>`. `src/index.scss:33-84` adds `.skip-link` (off-screen until `:focus`), global `a/button:focus-visible` (3px `#71ffb4` outline), `.app-shell` flex centering, and `@media (prefers-reduced-motion: reduce)` (removed duplicate from `Nav.scss`). `src/components/pages/explainers.tsx:117` changed from `<main>` to `<div>` to avoid nested `<main>` inside the new outer `<main>`. E2E: `e2e/smoke.spec.ts:5-50` now checks skip-link + keyboard dropdown (Enter/Tab/Escape), all 7 `*-a11y.spec.ts` run full `AxeBuilder.analyze()` with no `#header/#footer` exclusions or `SHELL_NODES` filtering. Suite green: typecheck, 101 Vitest, 20 Playwright (full axe).
