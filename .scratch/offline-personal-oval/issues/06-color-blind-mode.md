# 06: Color-blind safe toggle + hatch + contours

**What to build:** A `Color-blind mode` toggle that keeps the same oval readable without color, via a safe palette plus alternating hatch and contour.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] Toggle button `Color-blind mode` `aria-pressed` next to legend, Light Lime focus per ADR-0002, persists `localStorage["sw:oval:cb:v1"]`, default off (clean colour wash, no hatch)
- [ ] When on: same bands `1-5/6-10/11-15/16+` remapped to color-blind safe ramp (Okabe-Ito/viridis) plus alternating hatch (`\` vs `/` vs `X`, neighbours never share) at 6% opacity via `OffscreenCanvas` `CanvasPattern` 16×16 + thin white contour per band edge
- [ ] Legend updates to show swatch + hatch square + line style per band; canvas `aria-label` updates to note color-blind mode; hidden table unchanged
- [ ] Optional tap/hover tooltip `Aurora 14 ~ Kp 6` for precision without numbers on map (if added, also keyboard accessible)
- [ ] Component test: toggle `aria-pressed` flips, persists key, default has no hatch element, enabled has hatch pattern class, axe audit passes in both modes; no pixel snapshot
