# Aurora guide page ("Guide")

Status: ready-for-agent

A read-through "What are auroras" guide page for laymen and travelers — what the lights are, when and where to look from the stored place, sky caveats, and starter traveler aids — living as a "Guide" entry in the About submenu next to Explainers, linked once from the interpreter panel header.

## Problem Statement

The interpreter panel answers "what do these numbers mean" but never teaches the whole evening: a first-season chaser or a traveler on a three-night trip still doesn't know what the lights physically are, when in the night to walk out, where to face from *their* latitude, how cloud/moon/town-lights veto the plan, or what to bring and how long to wait. Explainers answers terms one by one, but nobody reads a glossary cover to cover at −15 °C. The knowledge exists — scattered across popovers, the Tips page, and the owner's head — with no single narrative page to land on.

## Solution

One narrative page at `/about/guide`, reachable as "Guide" in the About submenu (This site / Sources / Explainers + Guide) and linked once from the interpreter panel header. Five sections in the traveler's evening order: what auroras are (brief) → when to look (Night/dark window, season) → latitude-aware where to look → sky caveats (cloud, moon, light-pollution link-outs) → traveler aids (clothing, patience, 3-line photo basics). Experience-voiced starter tips, every claim inside the honesty bounds, glossary terms inline (popups if ticket 07 has landed, links otherwise — either way via the shared term component, never hand-rolled anchors).

## User Stories

1. As a layman, I want one page explaining what auroras are in plain words, so that I understand what I'm looking at.
2. As a chaser, I want to know when in the night to walk out (dark window, season), so that I don't stand around at 18:00 in September.
3. As a chaser, I want where-to-look guidance that knows my latitude (overhead/south far north, northern horizon further south), so that I face the right way from my place.
4. As a chaser, I want the page to send me to the view-distance band and oval for tonight's position, so that static advice connects to live data.
5. As a traveler, I want cloud/moon/town-lights vetoes stated plainly with their link-outs, so that I can call off a bad night early.
6. As a traveler, I want starter aids (dress for standing still, give it 1–2 hours, tripod + manual infinity focus + wide aperture and seconds), so that my first night isn't wasted on basics.
7. As a layman, I want glossary terms explained without losing my place, so that jargon never ejects me from the page.
8. As a visitor, I want to reach the guide from the About submenu and the interpreter panel, so that it's findable from both reading and checking flows.
9. As a screen-reader and keyboard user, I want the page to meet the app bar (landmarks, headings order, axe clean), so that nothing about this page is second-class.
10. As a maintainer, I want every claim traceable to the honesty inventory or the owner's stated experience, so that future edits know what can change.

## Implementation Decisions

- **Route + IA:** `/about/guide` as an About-submenu entry cloned from the existing submenu pattern (same keyboard/a11y behavior); one link from the interpreter panel header; no top-level nav entry.
- **Five sections** per ticket 01 Part D, in order; where-to-look is latitude-aware (no blanket "face north") and defers live position to the view-distance band + oval with links.
- **Terms via the shared term component** — popups come free if ticket 07 landed first, plain links otherwise; no duplicated definitions, missing terms become Explainers additions.
- **Voice:** experience-voiced starter tips, caveated as such; photo basics stop at three lines.
- **House rules apply:** TypeScript strict, SCSS + BEM, Vitest + Playwright + axe, WCAG 2.1 AA, CONTEXT.md vocabulary, display-timezone formatting for any absolute time, no backend.

## Testing Decisions

- **Good tests assert external behavior only:** page renders its five headings, submenu entry routes to it, panel link lands on it — never component internals.
- **Modules tested:** page (component smoke: headings order, key copy present), submenu + panel link (integration through existing nav tests), Playwright journey (route loads, keyboard walk, axe audit, narrow layout).
- **Prior art:** the Sources subpage and Explainers journeys are the models for a static-page pass.

## Out of Scope

- A photography course beyond three lines; trip itineraries / multi-night planning; backend or accounts; localization; editing NOAA copy; any new data source.

## Further Notes

- Decisions: ticket 01 Part D (outline, boundary, IA, aids depth + latitude correction). Honesty bounds: ticket 01 Part B (Tips-band quoting, no cities until verified, no color promises, moon/m refresh caveats). Vocabulary per `CONTEXT.md`; standards per `docs/agents/coding-standards.md`.
