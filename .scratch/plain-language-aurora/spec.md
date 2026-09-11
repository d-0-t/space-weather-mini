# Plain-language interpreter panel

Status: ready-for-agent

A plain-language panel on Home that tells laymen and travelers what the current solar-wind and magnetosphere readings mean for them tonight — four interpreted rows in text + graphical tabs plus one combined sky line — layered on top of the existing expert detail, which stays untouched. Companion work: on-device moonrise/moonset/altitude wiring that the sky line's moon half needs.

## Problem Statement

Aurora apps are hard to use for people with no scientific background — a chaser told us exactly that about the competitors, and our app has the same shape of problem. Home shows live Kp index, solar-wind speed and density, interplanetary magnetic field Bt and Bz, hemispheric power in gigawatts, Dst, magnetometer traces — expert numbers whose explanations hide behind small info icons. A layman or traveler opening the app cannot answer the only question they have: "can I see aurora tonight from my place, and if so, when and where do I look?" There is no plain sentence anywhere that says what a southward Bz or a 600 km/s wind means for them, and the closest thing to a verdict — the view-distance band — only answers the next 30–90 minutes, never tonight. Meanwhile some of our own helper rows overstate what the science supports (Bz bands mapped to Kp outcomes with no source), which a plain-language layer must replace, not repeat.

## Solution

A plain-language interpreter panel near the top of Home: four rows — live Kp index, solar-wind speed, Bz (GSM), hemispheric power — each rendered at one of three plain levels (calm / active / storm-like) with one honest sentence per level, in two tabs carrying the same rows (a text tab that explains, a graphical tab of 3-step icon meters with no numbers), plus one combined sky line (dark window + cloud + moon + view-distance band) gated so a "look now" line never shows in daylight. Every sentence carries likelihood ("may, not will") and its mapping source; caveats (cloud, moon, town lights, approximate averages) ride along, never on a separate page. Density, Bt and Dst stay expert-only with no interpreter row. The existing numbers, charts, tables and explainers stay exactly where they are — the panel links down to them. Wording ships in two variants per row (P1 naming the values, P2 pure interpretation with no jargon) and the human picks per row at build review.

## User Stories

1. As a layman, I want one plain sentence per reading telling me what it means tonight, so that I never need to know what Bz or hemispheric power are.
2. As a layman, I want each row to speak in three plain levels (calm / active / storm-like), so that I can tell at a glance whether anything is happening.
3. As a traveler, I want the Kp row to quote NOAA's own viewing words (far-north dim / pleasing mid-latitude / northern-US edge / overhead in northern states), so that I get the official guidance, not the app's paraphrase.
4. As a traveler, I want every southward-reach line to say "may be seen" with the approximate-averages and geomagnetic-not-geographic caveats attached, so that I never mistake a reach marker for a promise over my town.
5. As a chaser, I want the Bz row to speak as a gate ("favors", "can drive") with sustained-hours language, so that a single spiky reading never reads as a verdict.
6. As a chaser, I want the speed row to say fast wind means possible storming only together with direction, so that a fast-but-northward stream doesn't mislead me.
7. As a chaser, I want the hemispheric-power row to say when aurora is observable with motion (~50 GW neighborhood) and what ~60 GW means, so that the gigawatt number means something.
8. As a layman, I want a graphical tab with icon meters and no numbers mirroring the text tab, so that I can check conditions in seconds.
9. As a layman, I want the text tab's sentences to link to the caveats and the expert detail below, so that I can dig one tap deeper when curious.
10. As a chaser, I want one combined sky line (dark window + cloud + moon + view-distance band) for my stored place, so that space weather and local sky read as one answer.
11. As a chaser, I want the sky line to never say "look now" in daylight, so that the app can't tell me to watch a sunlit sky.
12. As a chaser, I want the moon half of the sky line to know whether the moon is actually up during my dark window, so that a full moon below the horizon doesn't veto my night.
13. As a traveler with a far-away saved place, I want the sky line's times in my display timezone with the app's one-clock rule, so that tonight means my tonight the same way everywhere else does.
14. As a chaser on a stale connection, I want the panel to show As-of ages and saved-data notices like every other surface, so that I never read yesterday's wind as now.
15. As an expert, I want every number, chart, table and explainer exactly where it is today, so that the easy layer costs me nothing.
16. As a color-blind chaser, I want the graphical meters readable without color (lightness + shape, never hue alone), so that the quick check works for me.
17. As a screen-reader user, I want each meter exposed as text with its level name, so that the graphical tab loses nothing.
18. As a keyboard user, I want both tabs operable as real tabs with visible focus, so that I can switch without a mouse.
19. As a motion-sensitive user, I want no animation beyond the app baseline in the panel, so that nothing throbs or auto-plays at me.
20. As a mobile traveler, I want the panel to stack cleanly at narrow widths, so that the quick check works on my phone in the field.
21. As the site owner, I want both wording variants (named-values P1, no-jargon P2) drafted per row and to pick per row at build review, so that the shipped voice is a decision, not an accident.
22. As a maintainer, I want every shipped sentence traceable to its source band (SWPC Tips, phenomena pages, Tutorial, or the documented physics anchor), so that a future edit can check the claim.

## Implementation Decisions

- **Four interpreted rows, no more:** live Kp index, solar-wind speed, Bz (GSM), hemispheric power. Density, Bt and Dst keep their expert displays and get no interpreter row — no source-backed per-band wording exists for them, and Dst is a storm characterizer, never a viewing lead.
- **Pure interval-text tables are the seam:** one table per row mapping value to level plus sentence plus source key (value → level, sentence, source). Tables are pure data over the existing product hooks (solar-wind live rows, planetary K-index live feed with its observed/estimated/predicted tags, hemispheric-power feed, view-distance band), so sentences are unit-pinned per interval including boundaries — the same one-seam philosophy as the parser layer, no new data fetching.
- **Kp sentences quote the source:** the Kp→visibility lines use NOAA Tips on Viewing the Aurora band wording nearly verbatim (0–2 far north dim / 3–5 brighter with motion and formations / 6–7 northern US edge / 8–9 overhead in northern states) with the page's own approximate-averages and geomagnetic-latitude caveats on every line. The Kp→G mapping (5→G1 through 9o→G5, no "G0") rides on the existing threshold helper.
- **Bz rows are rewritten, not reused:** the current Bz→Kp help rows are unsourced and must not feed the tables. Bz sentences speak as a duration-gated gate (northward closed / weakly coupled / coupled / strongly-coupled-if-sustained-hours), probabilistic "favors / can drive" language only.
- **Speed and HP anchors:** speed bands (typical slow / elevated / fast with G1+ possible / very fast event-grade) always paired with the direction caveat; HP observable lines (~50 GW observable with motion; ~60 GW the physics-backed G1 neighborhood) with the model-explains-half-the-variance budget carried as uncertainty, never trimmed.
- **Southward reach without cities:** reach lines use the Tips phrasing plus the latitude rule as a reach marker with all caveats; no per-G city strings ship until read live from the official scales explanation (preferred alternative stands: skip cities entirely).
- **Panel shape:** one Home panel, two tabs (text sentences with caveat links / icon meters without numbers), same four rows both tabs, deep links into the existing expert cards. Meters use the house palette's lightness channel plus distinct shapes; level names are real text for assistive tech; tabs follow the app's existing accessible tab/modal patterns.
- **Sky-line composer:** combines the on-device daylight bands (Night gate first — no look-now line outside it), the Open-Meteo cloud picture for the stored place with its fetched-at stamp, moon position (below), and the view-distance band with its confidence and 30–90-minute lead time stated. No single go/no-go verdict in v1 — verdict wording is prototype work, not this build.
- **Moon-position helper (new, small):** moonrise/moonset plus altitude from the existing on-device ephemeris dependency, same pure-function shape as the daylight module, pinned by fixed-date unit tests. Until it lands, moon copy stays caged to "bright Moon washes out faint aurora".
- **Wording variants:** both P1 (names values while explaining) and P2 (no jargon) sentences are drafted per row in the tables; the human picks per row at build review and the loser is deleted, not shipped behind a flag.
- **House rules apply:** Display-timezone formatting for every absolute time in the panel (UTC-dated tables untouched); offline stale notices wherever a feed can age; TypeScript strict; SCSS + BEM; Vitest + Playwright; WCAG 2.1 AA; CONTEXT.md vocabulary (Kp index, Bz (GSM), Hemispheric power, View distance, Night, Weather (Local conditions)).

## Testing Decisions

- **Good tests assert external behavior only.** A table test feeds a value and asserts the level plus sentence key that comes out — never internal helpers. A panel test asserts landmarks, tab switching, and key sentences — never component internals.
- **Primary seam — the interval-text tables:** all twelve row/level sentences (plus the sky-line gate states: daylight veto, cloudy veto, moon-up modifier) pinned in unit tests incl. boundary values and the estimated/predicted Kp tags; NOAA wording changes fail loudly via mismatched keys, not silent rewording.
- **Modules tested:** the four tables plus sky-line composer (unit), the panel (component: renders, both tabs switch, meters carry text alternatives, daylight gate suppresses look-now), moon-position helper (unit, fixed dates incl. polar edge cases), and the Home journey via Playwright (panel renders on live-shape fixtures, tab keyboard path, axe audit, narrow-layout pass).
- **Prior art:** parser tests pinned to real NOAA fixtures establish the pin-the-boundary pattern; the conditions suites pin timezones (`TZ` = Europe/Stockholm) and fake the clock — the panel suites do the same; the webcams journey is the model for the Playwright + axe pass.

## Out of Scope

- The "What are auroras" guide page and About-submenu IA (decided in ticket 01 Part D — separate build spec follows; this panel links to Explainers as it exists today).
- Multi-night trip ranking; per-G city strings (until verified live); any Bortle/light-pollution number (link-outs only, per ADR-0005); color promises per place/time; reorganizing or removing expert detail; backend, accounts, push, proxy, localization, editing NOAA copy.
- A single go/no-go verdict — explicitly deferred to prototype comparison, not smuggled into this build.

## Further Notes

- Fact base: `docs/research/plain-language-pitfalls-2026-09-12.md` (why apps feel hard; our gaps) and `docs/research/plain-language-honesty-2026-09-12.md` (sourced interval language + the 12-item NO-GO list — normative for every sentence; items marked [RE-VERIFY] there must be re-checked live before their sentence ships).
- Wayfinder context: `.scratch/plain-language-aurora/map.md` with decisions 01–03; open tickets there (guide scope in ticket 01 Part D, prototype 04 as wording-review vehicle, moon wiring 02 folded into this spec) stay live until this spec's build consumes them.
- Vocabulary per `CONTEXT.md`; standards per `docs/agents/coding-standards.md`; constraints per ADRs 0001 (client-only default holds — nothing here needs a backend), 0003, 0005, 0006, 0008.
