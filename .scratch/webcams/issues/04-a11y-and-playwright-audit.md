# 04: A11y + Playwright audit for the webcams page

**What to build:** The accessibility and end-to-end pass that makes the page ship-worthy: axe-green Playwright journey, native-control accessibility, keyboard and modal paths, and nav/smoke suite updates.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] Every cam image carries alt text "Station, region — current sky view"; the Twitch iframe has a title; link rows expose their destination (station name as link text, kind note visible)
- [x] All selectable chips and settings are real native elements (checkbox chips, Show all / Hide all native buttons, checkbox auto-refresh, native buttons) and the keyboard path + focus styles work end to end, including the Hidden sources dialog's focus management
- [x] No autoplay anywhere: the Twitch embed's no-autoplay configuration is asserted in a unit test; no carousels or motion beyond the app baseline
- [x] A Playwright journey for the Webcams route (image responses intercepted) asserts the gallery, checkbox chips, Show all / Hide all, Hidden sources dialog, and auto-refresh state, and passes an axe audit; the existing smoke and nav journeys are updated for the new nav entry
- [x] Manual pass on the narrow (mobile) layout: chips wrap, cards stack, dialog fits; full Vitest + Playwright + typecheck + build green

## Comments

- 2026-09-01 — implemented (TDD: e2e journey written first, run red, then green).
  - New `e2e/webcams.spec.ts` (6 journeys): gallery (intercepted images, alt on every cam image, titled Twitch embed, cards-before-links), native checkbox chips with keyboard Tab walk + Select all/Deselect all, Hidden sources dialog with Escape-focus-return, auto-refresh native checkbox persistence, axe audit on the full gallery, and the narrow-layout pass (no overflow, cards stack, pills wrap, dialog fits) — the ticket's "manual pass" is encoded as the automated `webcams narrow layout` block.
  - `e2e/smoke.spec.ts` now asserts the Webcams nav entry with its `/webcams` href.
  - The axe audit surfaced one real bug, fixed in `webcams.tsx`: region section ids contained spaces ("webcams-region-North America"), which splits `aria-labelledby`/`aria-controls` idrefs into two bogus tokens (axe: aria-valid-attr-value, critical). `sectionId` now hyphenates whitespace; unit tests updated in lockstep.
  - Full suite green: 437 Vitest, 37 Playwright (incl. axe), typecheck + build.