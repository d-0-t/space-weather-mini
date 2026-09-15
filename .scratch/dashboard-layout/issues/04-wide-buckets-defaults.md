# 04: Wide Dashboard buckets with xl breakpoint and landscape exception

**What to build:** The wide responsive shell all later layout work rides on: canonical xl breakpoint at 1600px, Dashboard capped at 1600px with equal-halves 2-column from md and middle-widest `1fr 2fr 1fr` 3-column at xl, per-bucket default column membership for all eight panels, Webcams full-bleed with padding kept, and the landscape-phone exception rendering the normal 2-column reflow. Details and About family widths, table shapes and tokens stay untouched.

**Blocked by:** 01 (needs the four split panels to place)

**Status:** ready-for-agent

- [ ] 1-column below md, `1fr 1fr` 2-column from md to below xl, `1fr 2fr 1fr` 3-column at xl with the agreed default membership per bucket
- [ ] Resizing across a bucket switches to that bucket's defaults immediately and empty columns collapse
- [ ] Corrupt storage falls back to defaults and unknown panel ids append rather than vanish
- [ ] Webcams uses the full width with page padding; Details, About, Sources, Explainers and Aurora guide stay narrow
- [ ] Rotated phones matching landscape plus min-width 670px plus max-height 500px get the standard 2-column reflow while portrait phones stay single column
- [ ] Typecheck, unit suite, computed-style specs and axe audit stay green
