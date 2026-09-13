# Map: Aurora city strings — verified "towns where it may be visible"

## Destination

Decide whether the app ships a "towns where it may be visible" element for the interpreter, backed by the per-G city strings read live from NOAA's official Scales explanation — or a documented no-go. No city string ships anywhere until the first ticket has re-read it live at its own time and the honesty bounds hold.

## Notes

- Origin: plain-language ticket 08 (2026-09-14) — with the cities question open, the human chose to open this effort rather than waive it; the interpreter shipped city-free (N11, spec's preferred alternative). The per-G strings were first read live during that pass (G1 northern Michigan/Maine … G5 Florida/southern Texas) and are recorded in `docs/research/plain-language-honesty-2026-09-12.md` §9; that reading is a lead, not a substitute for this effort's own live verification.
- Domain vocabulary per `CONTEXT.md` (Interpreter, Interval text, Plain levels, View distance, Geocoded place, Kp index, Planetary K-index (live)) — no synonyms; new terms graduate via domain-modeling.
- Honesty bounds normative for every sentence: `docs/research/plain-language-honesty-2026-09-12.md` §6 — N3 (never town-level guarantees; use "may be seen"), N4 (no colour promises), N5 (no tonight claims from OVATION), N10 (no false precision), N11 (no city string until read live). Plus the Tips caveats: approximate averages, geomagnetic latitude not geographic.
- ADRs in play: 0001 (client-only default holds — a static string list needs no backend), 0006 (personal oval / View distance vocabulary), 0008 (display timezone).
- Standards: `docs/agents/coding-standards.md`; skills: wayfinder + grilling for the decision, tdd for any build that follows.

## Decisions so far

- [01: Verify city strings live + element decision (resolved 2026-09-14)](issues/01-verify-city-strings-live.md): Scales page read live — G1–G5 aurora clauses captured verbatim, including the missed fact that G1 has no geomagnetic-latitude qualifier and uses frequency language while G2–G5 are sighting records; the US-only strings ship nowhere. Tips re-confirmed as the visibility owner (Kp bands, 66° − 2°/Kp rule, approximate-averages + geomagnetic-not-geographic caveats; Kp 6 wording conflict flagged — Tips wins). **Human decision: ship a global towns element** — Tips rule + static city geomagnetic latitudes, dark-filtered (sun ≤ −12°), in Aurora now under the Kp block, flag + city + ordinal probability (icon, ranked, color, title attrib, alt), one city per probability per country. Build ticket [02](issues/02-global-towns-in-aurora-now.md) published with the confirmed seams.

## Not yet specified

- (Ticket 01 resolved 2026-09-14: the element is wanted and its home is decided — Aurora now, under the Kp block; construction is the Tips rule over a static global city array with approximate geomagnetic latitudes, dark-filtered; far-north and non-US viewers are served by the global array, so no per-region string handling is needed. Open details live in build ticket 02: city selection and MLAT method, probability band wording, render cap, flag assets, caveat copy, glossary term.)

## Out of scope

- Baking a recalled or stale city string into copy — the whole point of the first ticket.
- Editing NOAA copy or paraphrasing past the source bands.
- Any Bortle/SQM value (ADR-0005 link-outs only).
- Backend, accounts, push (ADR-0001 default holds).
