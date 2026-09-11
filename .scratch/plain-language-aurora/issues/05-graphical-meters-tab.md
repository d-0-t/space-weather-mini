# 05: Graphical meters tab

**What to build:** the panel's second tab — the same four rows as numberless 3-step icon meters for the seconds-long quick check, carrying exactly the levels the text tab computes (one shared level source, two renderings).

**Background:** ticket 03 owns the tables and levels; this ticket owns only the second rendering. Full behavior in `spec.md`; icons previewed in prototype ticket 04 — reuse what the human already approved there.

**Blocked by:** 03 (needs the panel shell and levels).

**Status:** ready-for-agent

- [ ] Meters readable without color (lightness + shape, never hue alone, consistent with the color-blind-safe oval treatment); each meter exposed as real text with its level name for assistive tech
- [ ] Tabs operable as real tabs with visible focus and full keyboard path; no animation beyond the app baseline; respects reduced-motion
- [ ] Panel stacks cleanly at narrow widths for field use on a phone; meter levels always agree with the text tab (shared source, covered by a test)
