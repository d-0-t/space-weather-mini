# 06: Pinned webcams column and side-by-side toggle

**What to build:** A layout toggle on the Pinned webcams panel for comparing two skies, independent of Compact. The control renders only with exactly two pins, defaults to the current column stack, persists across visits, and side-by-side is a 2-up grid from sm falling back to column on narrow widths.

**Blocked by:** 01 (needs the Pinned webcams Dashboard panel)

**Status:** done (folded into 05, no separate toggle)

2026-09-16 – Human decision: ticket 06's layout toggle IS the Pinned webcams Compact toggle, in its own panel – no separate control. Compact ON lays two pins side by side (2-up from sm via `respond-to(sm)`, column below sm and whenever roomy); roomy keeps today's column stack. The side-by-side choice persists through the per-panel Compact keys and composes with collapse. Fixed en route: `.pinned-webcam-card` gained `box-sizing: border-box` (like the live-panel cards) so padding/border ride inside the 50% flex basis instead of overflowing the row by 2px and wrapping; the Twitch player keeps its 16:9 frame while fluid. Regression: `e2e/compact.spec.ts` (roomy 2 rows, Compact 1 row at 1000px). The independent-toggle boxes below are superseded.

- [x] Two pins side by side from sm via Compact, stacked below sm and when roomy
- [x] Choice persists across visits and composes with per-panel Compact densify and collapse
- [x] Typecheck, unit suite and axe audit stay green
