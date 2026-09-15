# 05: Per-panel Compact replacing the global toggle

**What to build:** Per-panel Compact checkboxes with compress icon left of the label on Solar wind, Magnetosphere and Pinned webcams only, so chasers densify just the noisy panels. State persists per panel default off with native checkbox semantics; the legacy global key migrates (on maps to all three on) and is then removed.

**Blocked by:** 01 (needs the Dashboard panels to host the toggles)

**Status:** ready-for-agent

- [ ] Solar wind, Magnetosphere and Pinned webcams each show an icon-led Compact checkbox in the panel header; no other panel does
- [ ] Each toggle densifies only its own panel and persists across visits default off
- [ ] Legacy global on migrates to all three on once, then the legacy key is deleted; legacy off or missing leaves defaults
- [ ] Keyboard, screen-reader naming and focus visibility match the color-blind pill pattern with no aria-label
- [ ] Typecheck, unit suite and axe audit stay green
