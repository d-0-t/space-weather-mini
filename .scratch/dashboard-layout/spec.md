# Dashboard layout: rearrangeable panels, wide columns, per-panel Compact, aurora split, Jump to top, document titles

Status: ready-for-agent

## Problem Statement

Chasers open the Dashboard on phones, rotated phones, laptops and wide monitors, and the single fixed 2-column layout wastes the extremes: narrow landscape phones stay stuck in one column, wide monitors cap at 1200px with no third column, and Local conditions stays one narrow column while daylight, weather and maps stack. The Aurora now panel bundles four stories (Kp numbers, plain-language Summary, Oval glow intensity map, Reach towns) into one collapsible, so a chaser cannot scan or collapse them independently. The global Compact view toggle squeezes everything or nothing, Pinned webcams always stacks vertically even with two pins side by side on a wide column, long pages have no shared way back to the top with focus restored, and the browser tab never names the page (every route reads the same title).

## Solution

Split Aurora now into four Dashboard panels (Aurora now, Summary, Oval glow intensity, Possible locations), make every Dashboard panel rearrangeable per layout bucket through an Arrange modal, go wide (Dashboard to 1600px with 1fr 2fr 1fr 3-column at the new xl breakpoint, Webcams full-bleed, Local conditions 2-column at lg with the Three-day weather forecast as its own section), replace the global Compact view with per-panel Compact on Solar wind, Magnetosphere and Pinned webcams, give Pinned webcams a side-by-side toggle for two pins, add a shared Jump to top footer button that restores focus to the h1, and derive every document title from its h1 as `{H1} – Space Weather`.

- **Aurora split:** Aurora now keeps Kp numbers, View distance line with place picker, attribution and the Moon badge. Summary is the Interpreter paragraph standalone with time-ahead selector, As-of line and Aurora guide link. Oval glow intensity owns forecast time, glow intensity table disclosure, color-blind toggle, canvas, legend and full-size view. Possible locations is the Reach towns list under its new heading with unchanged eligibility rules. Guide deep-links to the Oval and View distance anchors keep working from their new panels.
- **Rearrange:** one saved object holds per-bucket column membership (1-column list, 2-column A/B, 3-column A/B/C) with the agreed defaults; resize switches buckets immediately; unknown ids append rather than vanish; empty columns collapse. The Arrange modal (native dialog, tabs per bucket, drag handles plus up/down buttons and arrow keys, Apply commits all, Cancel and dismiss discard, focus returns) is the only editor.
- **Wide:** 1-column below md, 2-column `1fr 1fr` from md to below xl, 3-column `1fr 2fr 1fr` at xl 1600px. Landscape phones (`landscape`, min-width 670px, max-height 500px) get the normal 2-column reflow. Details, About, Sources, Explainers and the Aurora guide stay at 800px.
- **Compact and Pinned:** Compact is a per-panel checkbox with compress icon left of the label on Solar wind, Magnetosphere and Pinned webcams only, persisted per panel default off; the old global key migrates on (all three on) then deletes. Pinned webcams gains a layout toggle visible only with two pins (column default, side-by-side 2-up from sm), persisted, independent of Compact.
- **Jump to top and titles:** one shared footer component, hidden unless the page overflows, replaces the per-region webcams adornments; press scrolls to top and focuses the h1. Document titles update on every route change including back/forward, pure h1 derivation, no dynamic suffixes.

## User Stories

1. As a chaser, I want Aurora now, Summary, Oval glow intensity and Possible locations as separate collapsible Dashboard panels, so that I can scan and collapse each story independently.
2. As a chaser, I want the Summary panel to keep the plain-language paragraph with time-ahead selector, As-of line, Moon caveat, reach sentence and guide link, so that nothing I rely on is lost in the split.
3. As a chaser, I want the Oval glow intensity panel to keep forecast time, glow table, color-blind toggle, map, legend and full-size view together, so that the map story stays whole.
4. As a chaser, I want Possible locations to keep the Possible/Likely/Very likely ranking with unchanged eligibility, so that the town list stays honest.
5. As a chaser, I want existing Guide links to the Oval and View distance anchors to keep landing correctly, so that bookmarks and the guide do not break.
6. As a chaser, I want to rearrange Dashboard panels through an Arrange modal, so that my most-watched panels sit where I look first.
7. As a chaser, I want separate arrangements per layout bucket (1/2/3-column) that persist across visits, so that phone, laptop and wide-monitor layouts each stay mine.
8. As a chaser, I want resizing across a bucket to switch to that bucket's arrangement immediately, so that rotating or widening never shows a hybrid.
9. As a chaser, I want Apply to commit and Cancel/dismiss to discard without touching the live Dashboard mid-edit, so that experimenting is safe.
10. As a keyboard and screen-reader user, I want the Arrange lists draggable by mouse and movable by buttons and arrow keys with focus returned to the trigger, so that rearranging meets WCAG 2.1 AA.
11. As a chaser, I want a Reset-to-default affordance in the Arrange flow, so that I can undo my experiments.
12. As a wide-monitor chaser, I want a 3-column Dashboard with the middle column widest, so that the Oval canvas and sparklines breathe without starving side panels.
13. As a laptop chaser, I want the 2-column layout unchanged in fractions, so that nothing I know moves unexpectedly.
14. As a phone chaser rotating to landscape, I want the normal 2-column reflow instead of a tall single column, so that the width is used.
15. As a portrait-phone chaser, I want to stay in 1-column with Pinned webcams right after Aurora now, so that the sky check stays near the top.
16. As a webcams visitor on a wide screen, I want the gallery full-bleed with padding, so that cards use the width.
17. As a Local conditions chaser on a wide screen, I want daylight plus external maps left and weather plus Three-day weather forecast right, so that planning reads side by side.
18. As a Local conditions chaser, I want the Three-day weather forecast as its own section with the daily table unchanged, so that it collapses and anchors independently.
19. As a mobile Local conditions chaser, I want daylight, weather, 3-day, external maps top to bottom, so that the story still flows.
20. As a chaser, I want per-panel Compact on Solar wind, Magnetosphere and Pinned webcams with an icon-led label, so that I can densify only the noisy panels.
21. As a chaser with the old global Compact on, I want my choice migrated to all three panels on, so that nothing silently expands.
22. As a chaser with two pinned webcams, I want a column/side-by-side toggle on that panel only, so that I can compare skies.
23. As a reader at the bottom of any overflowing page, I want a shared Jump to top button that returns focus to the heading, so that I can restart with keyboard and screen reader context intact.
24. As a reader on a short page that does not scroll, I want no Jump to top button, so that there is no dead control.
25. As a tab-hoarder, I want every route to set the tab text from its h1 (`{H1} – Space Weather`), so that Dashboard, Webcams, Local conditions, Details pages, About subpages, Explainers and the Aurora guide are distinguishable.
26. As a keyboard user, I want skip link, visible focus, heading order and one h1 per page preserved through all of the above, so that nothing regresses on a11y.
27. As a developer, I want the new vocabulary (Dashboard, Dashboard panel, Summary, Oval glow intensity, Possible locations, Compact, Arrange modal, Layout bucket, Jump to top, Document title, Three-day weather forecast) used in code, copy and tests, so that names stop drifting.

## Implementation Decisions

- **Seams:** highest seam is the Dashboard composition layer (panel registry plus layout-bucket renderer); Aurora split reuses the existing OVATION, Kp, solar-wind and Reach-towns data seams with no refetch; Compact and Pinned layout are per-panel presentation state beside the existing collapse state; Jump to top plus document titles live at the app shell and page-footer layer; conditions split reuses the existing Open-Meteo seam.
- **Aurora split:** four sibling Dashboard panels; View distance line and place picker stay with Aurora now; Reach towns moves verbatim into Possible locations under the new heading; attribution and Moon badge stay with Aurora now; Oval anchors travel with their panels.
- **Defaults:** 1-column top to bottom Aurora now, Pinned webcams, Summary, Oval glow intensity, Possible locations, Solar wind, Magnetosphere, Forecast. 2-column A holds aurora now, summary, glow intensity, forecast; B holds pinned webcams, possible locations, solar wind, magnetosphere. 3-column A holds aurora now, summary, glow intensity; B holds solar wind, magnetosphere; C holds pinned webcams, possible locations, forecast.
- **Persistence:** one versioned object for per-bucket column membership; corrupt or foreign shapes fall back to defaults; unknown panel ids append to a sensible bucket; empty columns collapse. Per-panel Compact keys default off with one-time migration from the legacy global key (on maps to all three on, then the legacy key is removed). Pinned layout key defaults to column.
- **Arrange modal:** native dialog with bucket tabs, mouse drag plus up/down buttons and arrow-key moves, live order edits inside the dialog only, Apply persists and re-renders, Cancel and all dismiss paths discard, focus returns to the trigger, Reset-to-default included.
- **Wide layout:** canonical breakpoints gain xl 1600px via the existing mixin; Dashboard max 1600px; 2-column equal halves; 3-column middle-widest; Webcams max-width none with page padding kept; Details and About family stay narrow; landscape-phone exception uses a raw orientation/width/height query and renders the standard 2-column reflow.
- **Pinned toggle:** rendered only with exactly two pins; column is the default; side-by-side is a 2-up grid from sm falling back to column below; independent of per-panel Compact.
- **Compact control:** checkbox pill with compress icon left of the label, right-aligned in panel headers following the color-blind pill pattern, native checkbox semantics; v1 panels are Solar wind, Magnetosphere and Pinned webcams only.
- **Jump to top:** shared footer component on all top routes; visibility from an overflow hook (re-evaluated on resize and after feeds load); hidden when no overflow; activation scrolls to top and focuses the h1 (focusable heading, no focus outline surprise); replaces the per-region webcams adornments.
- **Document titles:** derived from the rendered h1 on every location change (back/forward included); static mapping only; Time and Astro state never affect the title.
- **Vocabulary:** user-facing copy, type names and test names use the glossary terms; no synonyms per the Avoid lists; ADRs 0010 (per-bucket persistence) and 0011 (xl plus landscape exception) are respected.

## Testing Decisions

- External behavior only, never implementation details; no snapshots of product output.
- Highest-seam coverage first: Dashboard composition tests (default column membership per bucket, resize switching, corrupt-storage fallback, unknown-id append, empty-column collapse), Arrange modal tests (tab switching, drag and keyboard reorder, Apply commits, Cancel discards, focus return, reset), Compact tests (per-panel independence, persistence, legacy migration), Pinned layout tests (toggle hidden unless two pins, persistence, narrow fallback).
- Aurora split tests: four panels render with headings in default order, Summary keeps selector/As-of/guide link, Oval keeps table/toggle/canvas/legend, Possible locations keeps ranking rules, Guide deep-links land.
- Wide-layout tests: computed-style checks at widths below/above md/xl plus the landscape-phone orientation exception, following the existing typography e2e pattern; no horizontal overflow on any page.
- Conditions tests: 2-column mapping and mobile stacking order, 3-day section independence, fetched-at and attribution ownership unchanged.
- Shell tests: Jump to top hidden on short pages, visible on overflow, focus lands on h1; document title asserts per route from h1; axe audit stays green per page following the existing Playwright pattern.
- Prior art: Dashboard composition tests, webcams tablist and dialog tests, Time modal focus tests, conditions page tests, typography computed-style specs.

## Out of Scope

- New data sources, new NOAA products, or changes to fetch cadence and polling discipline.
- Dragging panels directly on the Dashboard surface (Arrange modal only).
- Per-panel Compact beyond Solar wind, Magnetosphere and Pinned webcams.
- Dynamic document-title suffixes (alert counts, place names, Kp).
- Auto scroll-restoration on route change beyond the Jump to top button press.
- Changing Details or About page widths, table shapes, chart encodings, or color/type tokens.
- Backend, push, or server-side persistence (localStorage only).

## Further Notes

- ADRs 0010 and 0011 record the surprising parts (order switching on resize; new xl step plus raw orientation exception). Revisit bucket thresholds after real-hardware review starting from `1fr 2fr 1fr`.
- Glossary updates for this effort are already in the root glossary; specs and tickets must keep using those exact terms.
