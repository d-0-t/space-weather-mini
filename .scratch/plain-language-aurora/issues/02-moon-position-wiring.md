# 02: Moon position wiring (moonrise, moonset, altitude)

**What to build:** the missing moon-position half of the interpreter's sky line — moonrise/moonset times plus moon altitude for the stored geocoded place from the existing on-device ephemeris dependency, so a later line can honestly say whether the moon is above the horizon during the dark window. (Absorbs proposed build ticket 08 — same work.)

**Background:** moon phase % and illumination already exist and stay as-is; phase alone cannot say whether the moon is up (honesty inventory NO-GO N7: "full moon" ≠ "no aurora"; sourced claim stops at "bright Moon washes out faint aurora"). The sky line (ticket 06) consumes this; until then moon copy stays caged.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Moonrise/moonset/altitude exposed as pure functions in the same shape as the daylight module (injected date, no component state)
- [x] Unit tests pinned to fixed dates/latitudes including a polar edge case (moon never rises / never sets), TypeScript strict, Vitest
- [x] No UI copy in this ticket — position data only, consumed by ticket 06

Done 2026-09-12: `src/data/moon.ts` (`moonAltitudeDegrees`, `isMoonAboveHorizon`, `moonDayTimes`, `moonTimes`) over suncalc v2, 12 tests pinned to time.now literals (`docs/research/plain-language-moon-2026-09-12.md`), both polar edges covered (Tromsø never-rises 09-16, never-sets 09-30). Notes for ticket 06: rise/set are upper-limb events while the gate reads disk-center altitude; a day window can straddle a UTC midnight, so the scanner stitches two UTC-day scans (`moonDayTimes` takes the explicit window start).
