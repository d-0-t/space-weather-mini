# 04: A11y + Playwright audit for the webcams page

**What to build:** The accessibility and end-to-end pass that makes the page ship-worthy: axe-green Playwright journey, native-control accessibility, keyboard and modal paths, and nav/smoke suite updates.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Every cam image carries alt text "Station, region — current sky view"; the Twitch iframe has a title; link rows expose their destination (station name as link text, kind note visible)
- [ ] All selectable chips and settings are real native elements (checkbox chips, Show all / Hide all native buttons, checkbox auto-refresh, native buttons) and the keyboard path + focus styles work end to end, including the Hidden sources dialog's focus management
- [ ] No autoplay anywhere: the Twitch embed's no-autoplay configuration is asserted in a unit test; no carousels or motion beyond the app baseline
- [ ] A Playwright journey for the Webcams route (image responses intercepted) asserts the gallery, checkbox chips, Show all / Hide all, Hidden sources dialog, and auto-refresh state, and passes an axe audit; the existing smoke and nav journeys are updated for the new nav entry
- [ ] Manual pass on the narrow (mobile) layout: chips wrap, cards stack, dialog fits; full Vitest + Playwright + typecheck + build green