# 05: Live summary-word alert with configurable hindrance gates

**What to build:** a background alert type driven by the Summary's shared verdict word (imported, never forked — Summary improvements automatically improve alerts), gated by the chaser's per-hindrance settings at the stored geocoded place. This type speaks words; the Kp alert speaks numbers; the two are never mixed.

**Blocked by:** 02 (Push foundation).

**Status:** ready-for-agent

- [ ] The trigger reuses the app's shared grading functions as the single source of the verdict word; the poke copy describes with the word but decides by the shared rule.
- [ ] Three gates, each individually toggleable and all default on: cloud cover under the chaser's own percentage (default under 50%), no precipitation, darkness at or darker than the chosen band.
- [ ] Darkness choices are Night, Astronomical Twilight, Nautical Twilight, and Any (including daytime) — Twilight always spelled out.
- [ ] Every gate label names the stored place short name ("Cloud at Piteå"); cloud/precipitation reuse the Local conditions weather contract, darkness reuses the darkest-window computation.
- [ ] Stale live pokes die quietly (hour-scale time-to-live); reconnecting phones are never flooded.
