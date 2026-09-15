# 06: Pinned webcams column and side-by-side toggle

**What to build:** A layout toggle on the Pinned webcams panel for comparing two skies, independent of Compact. The control renders only with exactly two pins, defaults to the current column stack, persists across visits, and side-by-side is a 2-up grid from sm falling back to column on narrow widths.

**Blocked by:** 01 (needs the Pinned webcams Dashboard panel)

**Status:** ready-for-agent

- [ ] Toggle hidden with zero or one pin and visible with exactly two pins
- [ ] Column default matches today's stack; side-by-side shows both cams 2-up from sm and stacks below
- [ ] Choice persists across visits and composes with per-panel Compact and collapse
- [ ] Typecheck, unit suite and axe audit stay green
