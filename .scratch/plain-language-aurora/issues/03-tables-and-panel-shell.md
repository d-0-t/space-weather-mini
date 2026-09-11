# 03: Interval-text tables + panel shell with text tab

**What to build:** the interpreter's content seam and its Home on screen — four pure interval-text tables (live Kp, speed, Bz-as-gate, hemispheric power: 3 levels each, both P1/P2 variants drafted, source keys attached) wired into a new Home panel whose text tab renders one honest sentence per live row with caveat links and deep links into the existing expert cards. (Merges proposed 09+10.)

**Background:** content decisions in ticket 01 Part C; sentence sources in the honesty inventory (`docs/research/plain-language-honesty-2026-09-12.md`); full behavior in `spec.md`. The human picks P1/P2 per row at ticket 08 — this ticket drafts BOTH variants per row. Prototype ticket 04 may already have draft sentences worth lifting (note it if so, trim to the decision-rich wording).

**Blocked by:** None (can start immediately — foundations in ticket 01 are done).

**Status:** ready-for-agent

- [ ] Tables are pure data over the existing product hooks (no new fetching): value → level, sentence, source. Kp lines quote the SWPC Tips bands with both caveats; Bz speaks gate language only ("favors/can drive", sustained-hours) — the app's old Bz→Kp lookup must not feed the tables; speed always paired with the direction caveat; HP carries the model-uncertainty budget
- [ ] No color promises anywhere (N4): no sentence assigns green/red/purple to a place or time, oval red is never read as bad, and far-south viewers are told to expect red; no Kp↔glow conflation (N9): planetary Kp and local oval cells never interchangeable in any sentence
- [ ] Unit pins per interval including boundaries, estimated/predicted Kp tags, and missing-data states ("no data", never zero); 1-min L1 readings labeled "latest reading", never "conditions"
- [ ] Expert Bz card fixed at the source (absorbs ticket 09): its helper rows ("active (Kp3-4)" etc.) rewritten as gate language with sustained-hours framing — no band promises a Kp outcome — so expert detail and plain layer never contradict; its tests updated, no Kp-outcome assertions surviving
- [ ] Panel renders on Home with working tabs (text first), As-of/stale notices and display-timezone times like every other surface; expert numbers, charts, tables and explainers untouched
- [ ] Typecheck + Vitest green
