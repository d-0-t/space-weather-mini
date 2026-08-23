# 11 — App shell accessibility

**What to build:** the application shell meets the accessibility bar: a skip-to-content link, visible focus indicators everywhere, `prefers-reduced-motion` respected for any animation, logical heading order and landmarks across the shell (navigation, main, footer), and an axe audit passing on the shell itself.

**Blocked by:** 01 — Toolchain migration, 03 — 27-day outlook end-to-end

**Status:** ready-for-agent

- [ ] A skip link is the first focusable element and moves focus to main content
- [ ] All interactive elements have visible focus indicators
- [ ] Animations respect `prefers-reduced-motion`
- [ ] The shell (navigation + footer on every page) has correct landmarks and heading order
- [ ] Shell-level axe audit passes