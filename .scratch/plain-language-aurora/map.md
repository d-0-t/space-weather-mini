# Map: Plain-language aurora for laymen and travelers

## Destination

A spec to hand off (nothing built in this effort): a plain-language interpreter panel on Home with text + graphical tabs, plus a "What are auroras" guide page in the About submenu — so a layman or traveler with no scientific background can answer "can I see aurora tonight from my place, when and where do I look?" without the app removing any existing expert info.

## Notes

- Domain: single context — root `CONTEXT.md` plus `docs/adr/`. Every session reads the glossary terms it touches (View distance, Night, Local conditions, Geocoded place, Oval, Alert threshold, Kp index, Planetary K-index (live), Bz (GSM), Hemispheric power, Dst index, Weather (Local conditions), About submenu) and uses them verbatim; new terms (interpreter, interval text, quick check, aurora guide) graduate via domain-modeling, never as synonyms.
- ADRs in play: 0001 client-side-only (constraint DEFERRED per Q3 — stays default, overturned only if a ticket forces it), 0003 live polling, 0005 local conditions + manual refresh, 0006 offline PWA + personal oval, 0007 one-world oval + continuous ramp, 0008 display timezone defaults to local.
- Skills every session consults: grilling + domain-modeling. Standards: `docs/agents/coding-standards.md` (TypeScript strict, SCSS + BEM, Vitest + Playwright, WCAG 2.1 AA).
- Standing preferences from charting (Q1–Q14): keep all expert info, layer ease on top, no reorganization (Q9); audience is laymen + travelers, not experts-only (Q5); trip multi-night ranking is out — saved-place picking is enough (Q10); interpreter ships as TWO prototypes to compare: P1 names the values while explaining them, P2 gives clear interpretation with no scientific noise/jargon (Q13); interpreter panel has text + graphical tabs (Q12); honest-by-construction — never promise, every line carries likelihood + mapping source + cloud/moon/light-pollution caveats, and local sky data is folded in where available (Q14); validation by 5-minute first-use test is soft-maybe (Q8).

## Decisions so far

- [01: Foundations (merged 01+02+03+07)](issues/01-foundations.md): pitfalls audit + honesty inventory with 12-item NO-GO list + interpreter content decisions (4 rows × 3 levels, both tabs, gated sky line) + guide scope (5-section outline, latitude-aware where-to-look, "Guide" at `/about/guide`, spin-off popups) — done; facts in `docs/research/plain-language-pitfalls-2026-09-12.md` and `docs/research/plain-language-honesty-2026-09-12.md`, build spec in `spec.md`. Absorbed files removed.
- Build tickets 02–09 published from the specs and numbered clean (02 moon wiring; 03 tables+shell+expert-Bz fix; 04 merged prototype; 05 meters; 06 sky line; 07 inline glossary popups; 08 review+verification, last; 09 guide page build). Specs: `spec.md` (panel) + `guide-spec.md` (guide).

## Not yet specified

- Exact per-interval sentences (the 12 texts: 4 rows × 3 levels) — drafted at prototype time against the honesty inventory, human wordsmiths.
- Icon set for the graphical tab's 3-step meters that stays readable in color-blind mode and passes axe (previewed in ticket 04).

## Out of scope

- Multi-night trip ranking / travel-itinerary planning (ruled out Q10: place-picking already covers it).
- Reorganizing or removing existing expert detail (ruled in Q5/Q9: disclosure layers on top only).
- Backend, accounts, push, proxy (not decided — deferred per Q3; returns only if a ticket proves client-only can't do it, as a fresh effort redrawing the destination).
- Localization or editing NOAA content (carries over from the modern-stack migration scope).
