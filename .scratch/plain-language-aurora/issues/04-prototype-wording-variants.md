# 04: Prototype — interpreter wording variants (merged P1+P2)

Type: prototype

Status: open

Blocked by: 01 (done)

## Question

Build ONE cheap throwaway prototype of the interpreter panel and settle the voice by comparison. Background: ticket 01 Part C fixes the shape — four rows (live Kp, speed, Bz-as-gate, hemispheric power) × three levels (calm / active / storm-like), same rows in a text tab and a graphicaltab of numberless 3-step icon meters, plus a stub of the combined sky line. What is NOT decided is the voice, and this ticket decides it by showing both:

- **P1 variant:** plain-language summaries that NAME each value while explaining it (e.g. "Bz (GSM) is southward at −12 nT, which often means…").
- **P2 variant:** the SAME intervals with NO scientific noise or jargon — pure "what this means for you tonight" lines (strength, motion, when/where to look, why not if the sky is bright or cloudy).

Throwaway fidelity, reusing existing Home data hooks — switchable per row or side by side, whichever makes comparison easiest; enough for the human to react to wording, icons, and tab split. All draft sentences obey the ticket-01 NO-GO list (likelihood language, no Bz→Kp lookup, no city strings, no color promises, lead times on oval-derived lines). HITL: the human picks P1 or P2 per row (or merges) and the loser is deleted at build (ticket 08). Link the prototype as the ticket asset. (Absorbs old ticket 05, removed.)
