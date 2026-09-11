# 06: Sky line + daylight gate

**What to build:** the panel's combined sky line for the stored geocoded place — dark window plus cloud picture plus moon position plus view-distance band with its confidence — gated so a "look now" line never shows in daylight, and honest about what each half knows.

**Background:** the tonight-synthesis gap from the pitfalls audit (ticket 01 Part A) is this ticket's job, bounded by the NO-GO list (ticket 01 Part B): N3 no town guarantees, N5 no "tonight" from OVATION (every oval-derived line carries its 30–90-minute lead time), N6 no Bortle numbers (link-outs only), N7 moon veto only when the moon is actually up (ticket 02), N8 daylight veto first, N10 no false precision (bands + confidence, never single-km), N12 L1 readings as "latest", never "conditions". No single go/no-go verdict in v1. Full behavior in `spec.md`.

**Blocked by:** 02 (moon position), 03 (panel shell).

**Status:** ready-for-agent

- [ ] Composer is pure logic: Night band gates first, then Open-Meteo cloud with fetched-at stamp, moon altitude from ticket 02, view-distance band with confidence and lead time stated
- [ ] Likelihood + caveats ride on the line itself (may-not-will, approximate-averages, geomagnetic-not-geographic where reach is mentioned); Tips phrasing for reach, no city strings
- [ ] Unit pins for gate states (daylight veto, cloudy veto, moon-up modifier, not-in-range band) plus component render of each line state; typecheck + Vitest green
