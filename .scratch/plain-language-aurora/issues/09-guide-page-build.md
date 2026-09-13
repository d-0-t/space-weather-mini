# 09: Guide page build ("Aurora guide" at /about/guide)

**What to build:** the narrative aurora guide as specified in `guide-spec.md` — five experience-voiced sections (what / latitude-aware when + where / sky caveats / traveler aids), an "Aurora guide" entry in the About submenu, and one link from the interpreter panel — so a layman or traveler gets the whole evening in one read-through.

**Background:** outline, boundary, IA and aids depth decided in ticket 01 Part D; honesty bounds in Part B (Tips-band quoting with caveats, no verified-city strings, no color promises, moon/daylight caveats). Terms go through the shared term component (popups if ticket 07 landed, links otherwise).

**Blocked by:** 03 (the panel-header link needs the panel to exist; page + submenu themselves are independent).

**Status:** done

- [x] Route `/about/guide` renders the five sections in order with the decided voice; where-to-look is latitude-aware and defers live position to the view-distance band + oval via links
- [x] About submenu gains the "Aurora guide" entry with the existing submenu keyboard/a11y behavior; interpreter panel links to the guide once
- [x] Component smoke (headings order, key copy) + Playwright journey (route, keyboard walk, axe audit, narrow layout); typecheck + Vitest green

Done 2026-09-13 (TDD, seams confirmed with the owner before any test). Owner decisions taken during the build, overriding the older ticket text: the submenu entry and the page h1 are both **Aurora guide** (not "Guide"); the guide link sits at the **end of the interpreter summary** labelled "Read aurora guide →" (the ticket's "panel header" wording was redirected); the four guide terms missing from Explainers were **added to the shared glossary**.

Built: `src/components/pages/Guide.tsx` (+ route in `App.tsx`) — one `<article>`, five `<h2>` sections in the evening's order ("What auroras are", "When to look", "Where to look", "What can hide aurora", "Before you go out"); latitude-aware where-to-look (overhead / southern sky near the polar regions, low northern horizon further south, never a blanket "face north"); terms through the shared `GlossaryTerm` popups; cloud and light-pollution links baked with the stored place via `data/external-links` (`place-finder` links from the default Luleå place in tests); sky caveats (cloud, Moon, town lights, daylight); experience-voiced aids (dress for standing still, one to two hours, three-line photo basics). Honesty bounds kept: no colour promises (colours explained by altitude), no city strings, no Bortle/SQM numbers, Kp caveat names the approximate-average/geomagnetic-latitude limit, closing line says forecasts are odds, never a promise. `Nav.tsx` adds the fourth About destination; `AuroraSummary.tsx` closes with the one guide link (`AuroraSummary.scss` spaces it). The glossary grew 22 → 26 entries: `solar-wind`, `night`, `oval`, `view-distance` (CONTEXT.md terms, bodies mirror CONTEXT definitions; the `_Avoid_` caveat on bare "field" was caught in review and fixed).

Deep links: the guide points at `/#oval-glow` (id on all three OvalGlow states) and `/#view-distance` (the band section); `Home.tsx` scrolls a hash target when it appears (MutationObserver) because the Aurora Now panels mount only after their feeds land — the simple at-mount scroll of Explainers would miss them. `e2e/guide-a11y.spec.ts` pins the deep-link landing besides the route render + axe audit, the keyboard walk of the About submenu, the interpreter link, and the narrow-layout pass.

Review fixes still targeted the pre-modal PlaceFinder UI (`.conditions__place` chip, always-visible searchbox) and was refreshed to the `.place-finder__trigger` modal (staged pick + Apply/Cancel); `e2e/home-a11y.spec.ts`'s Solar-wind wait was given the same 60 s data timeout as the rest of the live-data checks; and `e2e/smoke.spec.ts` got a 120 s per-test budget because its 60 s live-fetch waits equalled the global 60 s test timeout (the live NOAA feed made the file flake twice under full-suite runs).

Docs: `CONTEXT.md` updated — About submenu now four destinations, Interpreter names its one guide link, new **Aurora guide** term with its `_Avoid_` line.

Tests: `Guide.test.tsx` (h1 + five headings in order, latitude-aware copy, deep-link hrefs, honesty bounds incl. Bortle/SQM, glossary-term popups, map link-outs), `glossary.test.ts` pins the four new ids/titles, `Nav.test.tsx` and `AuroraSummary.test.tsx` updated for the new entry/link, Playwright `guide-a11y.spec.ts` (5 journeys). Green: typecheck, 891 Vitest, full Playwright (the smoke spec's NOAA fetch flaked once on a live fetch and passes on re-run).
