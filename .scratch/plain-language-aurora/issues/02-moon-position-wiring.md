# 02: Moon position wiring (moonrise, moonset, altitude)

**What to build:** the missing moon-position half of the interpreter's sky line — moonrise/moonset times plus moon altitude for the stored geocoded place from the existing on-device ephemeris dependency, so a later line can honestly say whether the moon is above the horizon during the dark window. (Absorbs proposed build ticket 08 — same work.)

**Background:** moon phase % and illumination already exist and stay as-is; phase alone cannot say whether the moon is up (honesty inventory NO-GO N7: "full moon" ≠ "no aurora"; sourced claim stops at "bright Moon washes out faint aurora"). The sky line (ticket 06) consumes this; until then moon copy stays caged.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Moonrise/moonset/altitude exposed as pure functions in the same shape as the daylight module (injected date, no component state)
- [ ] Unit tests pinned to fixed dates/latitudes including a polar edge case (moon never rises / never sets), TypeScript strict, Vitest
- [ ] No UI copy in this ticket — position data only, consumed by ticket 06
