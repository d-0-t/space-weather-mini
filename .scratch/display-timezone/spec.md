# Display timezone

Status: ready-for-agent

Unify every timestamp the app shows under a single two-state Display timezone setting — Local (device zone, the default) or UTC — chosen from a Time modal in the navigation. Companion work: the About section becomes a submenu (This site / Sources / Explainers).

## Problem Statement

The app shows a mix of clocks. Freshness lines say "As of Aug 26 16:36 UTC" while an adjacent card says "Updated 5m ago (14:33)" in device time; chart axes and hover tooltips tick along in UTC hours that run ahead of (or behind) the visitor's watch; the live banner prints raw unformatted UTC timestamps; forecast product pages show the same Issued fact twice in two zones; the aurora map shows a forecast time in UTC followed by "your time" in brackets. A visitor who does not habitually convert UTC cannot tell when a wind spike or a Kp window actually happens in their evening. A superuser who *does* think in UTC has no way to put the whole app on the clock NOAA publishes in.

## Solution

One setting, two states: **Local** (the device's timezone, the default) and **UTC**. Every absolute timestamp the app renders obeys it, and exactly one time is ever shown per fact — no dual lines, no parenthetical conversions. The setting lives behind a gear-icon "Time" button in the header navigation (next to Astro mode), opening a modal with a "Show times in UTC" checkbox and Apply / Cancel / close semantics; the choice persists across visits and takes effect immediately on every page. Relative ages ("15m ago") stay relative in both modes. Two tables whose rows aggregate NOAA's UTC days (27-day outlook, daily geomagnetic indices) keep their UTC date cells and say so clearly while Local is chosen. In Local mode the app goes quiet about zones — no suffixes, the visitor's own clock — while UTC mode keeps the " UTC" suffix chasers expect.

## User Stories

1. As a casual visitor, I want all shown times in my device's timezone by default, so that I never convert UTC in my head.
2. As a superuser, I want to switch every shown time to UTC, so that I can cross-reference NOAA's own pages directly.
3. As a visitor, I want a Time button in the header navigation, so that I can change the setting from any page.
4. As a visitor, I want the setting persisted between visits, so that I never choose it twice.
5. As a visitor, I want the Time modal to explain that times follow my device's timezone no matter which place I've picked, so that Local conditions for a far-away place doesn't confuse me.
6. As a visitor, I want Apply / Cancel / X / Esc on the Time modal, so that I can back out of a change without applying it.
7. As a visitor, I want exactly one time per fact everywhere, so that no screen shows me two clocks for the same moment.
8. As a chaser, I want chart axes and hover tooltips in my chosen timezone, so that a wind spike lands on the hour I experienced it.
9. As a chaser, I want the Aurora Now current 3-hour window labeled in my chosen timezone, so that I know when it ends by my clock.
10. As a chaser, I want the 3-day Kp forecast slot rows labeled in my chosen timezone, so that I can plan my evening at a glance.
11. As a chaser, I want "today" in the forecast mini-table to mean my calendar day, so that shortly after midnight the app stops calling yesterday "today".
12. As a chaser, I want a 3-hour slot that straddles my midnight filed under the day it starts in, so that grouping stays predictable.
13. As a visitor, I want the live banner's timestamps formatted like every other timestamp, so that I can read them at a glance.
14. As a visitor, I want each forecast product page to show a single Issued line in my chosen timezone, so that the header states the fact once.
15. As a visitor, I want relative ages ("just now", "15m ago") to stay relative, so that freshness reads identically in both modes.
16. As a traveler, I want Local conditions times rendered in my device's timezone even when the stored geocoded place is elsewhere, so that every time on screen follows one clock I understand.
17. As a traveler, I want the modal to state the device-timezone rule, so that I understand why a Swedish place shows times shifted from its own solar schedule.
18. As a visitor, I want the 27-day outlook and daily geomagnetic indices to keep UTC date cells, so that each row still means exactly one NOAA UTC day.
19. As a visitor, I want a clear note above the UTC-dated tables while Local is chosen, so that I don't misread a UTC day as my day.
20. As a superuser, I want no note above the UTC-dated tables while UTC is chosen, so that the page stays uncluttered.
21. As a visitor, I want " UTC" suffixes only in UTC mode, so that Local mode reads clean without zone noise.
22. As a visitor, I want the setting to take effect immediately across every open surface, so that flipping it feels instant.
23. As a mobile visitor, I want the Time button reachable from the hamburger menu, so that it works on small screens.
24. As a screen reader user, I want the Time button, checkbox, and modal controls properly labeled, so that I can operate them non-visually.
25. As a keyboard user, I want the modal's focus handling to match the app's existing modal pattern, so that it traps and returns focus the way the alerts modal does.
26. As a webcam viewer, I want the "Loaded HH:MM" stamp to obey my chosen timezone, so that it agrees with everything else on screen.
27. As a visitor, I want chart day labels to follow my calendar in Local mode, so that "Tuesday" is my Tuesday.
28. As a superuser, I want UTC mode to preserve today's display, so that nothing I rely on disappears.
29. As a visitor, I want About split into a submenu with This site, Sources, and Explainers, so that I can find source attributions and explainers directly.
30. As a keyboard user, I want the About submenu to behave exactly like the Details submenu, so that navigation stays predictable.

## Implementation Decisions

- **Display timezone** is a two-state value (`local | utc`), defaulting to `local`. It persists as a versioned localStorage entry following the house storage-module pattern (value envelope with version, defensive load with default fallback, injected storage for testability).
- A **small context at the app root** provides the Display timezone to all consumers so a change propagates live, without reload, on every page.
- A **single display-time module** owns all absolute-time rendering: short absolute strings (with the " UTC" suffix only in UTC mode), chart tick labels, tooltip timestamps, 3-hour slot ranges, day labels, day bucketing, and Issued formatting. Relative age formatting stays zone-free and is part of the same module's surface. Existing scattered helpers are consolidated onto this module rather than duplicated further.
- **Day semantics**: "today" is the Display timezone's calendar day; a day-boundary-straddling slot belongs to the day its start falls in. The current-slot highlight stays instant-based and therefore does not move between modes.
- **Live banner raw timestamps** (unformatted time tags interpolated today) are replaced with the shared formatter — treated as a bug fix riding along.
- **Forecast product pages** show a single rendered Issued line in the chosen zone ("Issued (UTC)" in UTC mode, plain "Issued" in Local mode). The verbatim NOAA text inside product bodies is untouched — it is product content, not app formatting.
- **Place-local time conversion**: the weather contract retains the UTC offset and IANA timezone that Open-Meteo already returns with `timezone=auto`, so Local conditions timestamps (naive place-local strings) resolve to instants and re-render in the Display timezone. The device zone is authoritative in Local mode; the geocoded place's own clock is never displayed. The Time modal explains this rule.
- **UTC-dated tables**: date cells stay UTC in both modes; a short muted note above each table renders only while Local is chosen; the Time modal mentions the exception.
- **Time control**: a settings-gear icon button labeled "Time", styled like the Astro mode button, placed before it in the header navigation; it opens a modal with the checkbox plus close (X), Cancel, and Apply (Apply saves and closes; Cancel, X, and backdrop/Escape dismiss without saving). The modal follows the app's existing modal pattern for focus management.
- **About submenu**: the About entry becomes a dropdown cloned from the Details submenu pattern (same keyboard and accessibility behavior): **This site** at the existing about route (heading retitled "This site"; biography and future-plans article stay), **Sources** as a new subpage at `/about/sources` (the Data & Sources article moves there), **Explainers** keeping its existing route with its link moved from top level into the submenu.
- **No date library is introduced**; formatting uses `Intl` and the Date UTC methods, consistent with the existing codebase. NOAA wire formats and parsers are unchanged.

## Testing Decisions

- Good tests assert external behavior only — rendered strings, storage round-trips, modal interactions — never internal helper calls.
- **The one new seam is the display-time module**: deterministic unit tests with a pinned timezone and an injected clock cover both modes, midnight crossing, slot/day bucketing including the straddling slot, place-local conversion with an offset, and the suffix rules. Prior art: the timezone-pinned tests for the existing live-data helpers.
- **Storage** is tested through the standard load/save/default/invalid-data pattern with injected storage. Prior art: the alert threshold and color-blind mode storage tests.
- **Component spot-checks** ride existing suites: navigation tests (Time button presence/order, About submenu accessibility and keyboard behavior), the alerts-modal test pattern (open/apply/cancel), and per-surface timestamp assertions (freshness lines, aurora forecast-time line, alerts feed, forecast labels, UTC-dated table notes, Local conditions conversion, webcam loaded stamp) updated in place to cover both modes.
- Tests that need determinism pin the timezone per file — the existing convention; the global test setup deliberately does not pin one.

## Out of Scope

- The alert threshold: it is currently switched off and not working; this effort neither debugs nor relocates it.
- Per-page, per-card, or three-state ("show both") timezone choices — two states only, by design.
- Converting the UTC-dated tables' row identity or splitting UTC-day aggregates into local days.
- Any change to NOAA wire formats or their parsers; only the Open-Meteo contract retains fields it already receives.
- Locale/i18n selection beyond the app's existing device-locale behavior; Astro mode and theming beyond hosting the new button.

## Further Notes

- The decision is recorded in ADR-0008 (Display timezone defaults to Local); the glossary gained **Display timezone**, **Place-local time**, and **UTC-dated table**.
- The grilling session that produced this spec settled: device zone (not place zone) for Local; one time only; suffix rules; day-bucket grouping by slot start; the UTC-dated carve-out; the modal semantics; and the About submenu structure.
- The Details submenu is the structural precedent for the About submenu, and the alerts modal is the behavioral precedent for the Time modal.
