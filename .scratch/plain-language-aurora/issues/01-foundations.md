# 01: Foundations (merged 01+02+03+07) — research + content + guide decisions

Type: research

Status: done

Blocked by: none

Decided 2026-09-12 with the human; consumed by `spec.md` in this directory. Created by truly merging the three resolved tickets below — their separate files were removed, nothing dropped.

## Part A — Aurora-app usability pitfalls + audit of ours (was ticket 01)

**Question:** What makes aurora apps "hard to use" for laymen/travelers with no scientific background, and where does OUR app still do that? Survey common pitfalls in popular aurora apps (jargon, number walls, unclear tonight call, timezone confusion, map legibility, alert overload) from high-trust primary sources (app docs/reviews, NOAA SWPC explanations, accessibility guidance), then audit our Home / Local conditions / Oval / Webcams against the same list. No design, no build.

**Answer:** 6 pitfalls: jargon, number walls, no tonight call, UTC confusion, color-only maps, alert overload. Our gaps: Dashboard is a number wall with gloss behind (i) popovers; closest verdict is the 30–90 min View distance band, not tonight; device-zone times for far places (traveler trap); light pollution has no value (link-out only); cloud/moon/darkness live on different routes with no combined call. OVATION is 30–90 min only, never "tonight" — inherited gap. Full inventory: `docs/research/plain-language-pitfalls-2026-09-12.md`. Flag resolved 2026-09-12: default place is Luleå per human decision — use Luleå in copy.

## Part B — Science-honesty + local-sky data inventory (was ticket 02)

**Question:** What can we HONESTLY say in plain language per value interval, and what local sky data can we fold in? For solar-wind speed, Bz (GSM), live Kp index, hemispheric power (plus Bt/density/Dst as candidates): which visible effects (strength, motion, color, southward extent) do high-trust primary sources actually support, with which uncertainty? What fixed city list + Kp→G-scale mapping can back a "visible as far south as X, Y, Z" line without promising? What do we already have in-app for cloud, moon, light pollution plus display-timezone rules? Deliver a sourced fact table + explicit no-go lines.

**Answer:** Kp→G verified 3 ways (5→G1 … 9o→G5); visibility lines must quote SWPC "Tips on Viewing the Aurora" bands with its approximate-averages caveat. Southward edge ≈ 66°−2°×Kp geomagnetic, sightings ~1000 km beyond bright oval, view-lines conservative (60% of Aurorasaurus reports equatorward). HP anchor ~61 GW ≈ Kp 5+/6−; speed 400 typical / 500–800 fast / 700+ event-grade (DSCOVR 15–60 min lead only); Dst −50/−100/−200 floors, never a viewing forecast; Bz is duration-gated probability — the app's Bz→Kp help rows are unsourced heuristic (top NO-GO), same for speed/density/Bt band labels. Colors: green overhead common, red high-altitude/stormtime, purple fringe — never promise. Sky: cloud/darkness/moon-phase/timezone/view-distance available; moonrise/set cheap via suncalc (missing — see ticket 02); light-pollution value unavailable (link-out only); no tonight-synthesis (the interpreter's job). Full tables + 12-item NO-GO list: `docs/research/plain-language-honesty-2026-09-12.md` ([RE-VERIFY] city strings + HP legend wording before shipping).

## Part C — Interpreter content design (was ticket 03, decided with the human Q15–Q18)

**Question:** What does the interpreter panel SAY and SHOW? Value subset + interval boundaries, one pre-written text per interval, icon quick-check levels, text-tab vs graphical-tab split — layered on top of existing Home detail with no reorganization. No code.

**Answer, bounded by the Part B NO-GO list:**
- **Four rows:** live Kp index, solar-wind speed, Bz (GSM), hemispheric power. Density, Bt, Dst stay expert-only, no interpreter row (no NOAA per-band wording; Dst never leads).
- **Three plain levels per row** (calm / active / storm-like), one honest sentence each — every line carries likelihood ("may, not will") plus its mapping source. Finer bands stay in the expert numbers below.
- **Both tabs, same rows:** text tab = one honest sentence per row with caveat links; graphical tab = the same rows as 3-step icon meters, no numbers. Both link down to existing expert detail; nothing reorganized.
- **One combined sky line** (dark window + cloud + moon + view-distance band), daylight-gated so a "look now" line never shows by day. Moon-up/down half waits on ticket 02. No single go/no-go verdict yet — verdict wording deferred to the prototype comparison (ticket 04).
- **Carried constraints:** Kp→visibility sentences quote SWPC Tips bands with both caveats; Bz rows rewritten as gate language ("favors/can drive"), the app's Bz→Kp lookup is NO-GO; southward-reach lines use Tips phrasing, no city strings until read live (N11); no Bortle numbers (link-outs only); lead times on every oval-derived line; "latest reading, never conditions" for 1-min L1 values.

## Part D — Aurora guide page scope + About IA (was ticket 07, grilled with the human Q19–Q22; file removed)

**Question:** What goes on the new "What are auroras" guide page and where does it live? Page outline for the b+c combo, boundary with the Explainers glossary, entry in the About submenu, Home links. No code.

**Answer:**
1. **Outline (5 sections, in order):** what auroras are (brief) → when to look (Night/dark window, season) → where to look → sky caveats (cloud, moon, light-pollution link-outs) → traveler aids (clothing, patience, photo basics).
2. **Latitude-aware where-to-look (human correction):** far north the oval can be overhead or even south — never a blanket "face north". The section teaches reading the view-distance band + oval instead.
3. **Explainers boundary:** guide narrates and links terms, never redefines; missing terms become Explainers additions, not inline jargon.
4. **IA:** new About-submenu entry "Guide" at `/about/guide` (sibling to This site / Sources / Explainers); Home links to it once, from the interpreter panel header. No top-level nav entry.
5. **Traveler aids depth:** short, experience-voiced starter tips (dress for standing still in the cold, give it 1–2 hours, 3-line photo basics: tripod, manual focus to infinity, wide aperture + seconds) — starter tips, not a course.
6. **Spin-off:** terms navigating away mid-read is bothersome — filed as ticket 07 (inline glossary popups); the Part B honesty bounds apply to guide copy too.
