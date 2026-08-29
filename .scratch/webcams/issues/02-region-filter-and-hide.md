# 02: Region filter chips + Hidden sources dialog

**What to build:** Region filtering over the whole gallery using native checkbox chips with swift Show all / Hide all toggles, and per-source hiding (any source type) with a restore dialog showing a live hidden count, both persisted across visits.

**Blocked by:** 01

**Status:** done

- [x] A chip row above the gallery: one native checkbox per region present in the registry (Scandinavia, Alaska, Canada, US, Antarctica, Australia, New Zealand, UK, Greenland, Russia - fixed display order, absent regions don't render); checking one or more chips narrows image cards *and* link rows to those regions; zero checked shows everything; chip state is announced natively by the checkbox
- [x] **Show all** and **Hide all** native buttons beside the chips toggle every chip at once (Show all clears them; Hide all checks them all, leaving an honest empty state - "No webcams match your filters"); neither button affects the individually hidden sources, and the hidden set stays untouched by either action
- [x] Any source - image card, Twitch card, or link row - can be hidden; a hidden item leaves the gallery under every filter and its image is no longer fetched
- [x] Hidden sources persist in versioned local storage and stay hidden across visits and re-renders
- [x] A "Hidden sources (N)" native button - the count kept live in the label, e.g. "Hidden sources (18)" - opens the Hidden sources dialog (native dialog semantics - focus management, Esc to close, return focus) listing hidden entries with one-tap restore and a show-all affordance
- [x] Tests: checkbox chip filtering (checked state asserted natively), Show all / Hide all toggle every chip without touching the hidden set, hide writes storage and removes the item, dialog lists/counts/restores, hidden items survive a re-render; typecheck, build and the unit suite are green

## Comments

Implemented 2026-08-29. Deviations from the ticket text are deliberate user decisions:

- **The chips row is a popup checklist.** A **Filter** button (labelled "Filter (N)" with the applied region count while a filter is active) opens a native `<dialog>` containing one native checkbox per region present in the registry (fixed order, absent regions don't render), with **Show all / Hide all** draft toggles and an **Apply** button. The gallery is unchanged until Apply commits; Cancel/Escape discard the draft; Escape closes and focus returns to the Filter button. The ticket's "beside the chips" button pair therefore lives inside the popup, and the "checked state announced natively" requirement applies to the dialog checkboxes.
- **Checked means "keep only these regions"** (user decision). Zero checked shows everything. Consequently "Hide all" (checking every box) keeps every region, so the ticket's "Hide all leaves an honest empty state" line is superseded; the "No webcams match your filters" empty state still renders when the combined filter + hidden set leaves the gallery empty (asserted with a hidden card + Twitch card under a Scandinavia filter).
- **The checklist covers every region present in the registry, including Iceland and "Other regions" (the `rest` bucket)** (user decision, reversing the ticket's ten-region list) - so no entry is ever unfilterable and "Hide all" genuinely shows everything including link rows.
- **The applied region filter persists** under `localStorage["sw:webcams:filters:v1"]` = `{ v: 1, regions: [...] }` (user decision - the ticket says "both persisted across visits" but names no key); corrupt/foreign values fall back to no filter, unknown regions are dropped.
- **Hidden storage** is `sw:webcams:hidden:v1` (versioned id array, de-duplicated, corrupt → empty), exactly per spec; the hidden count derives from ids resolvable in the current registry, so a cam removed from the config stops counting (its stale id stays inert in storage).
- Hide buttons carry `aria-label="Hide {station}"`; dialog restore rows carry `aria-label="Show {station}"` plus a disabled-until-needed "Show all" affordance.
- Pre-existing red suite fixed along the way: the Details submenu order in `Nav.tsx` was still Daily-Data-first while `Nav.test.tsx` (and ticket 01's own comments) pin Geophysical-Alert-first - reordered to match the test; `setupTests.js`'s `<dialog>` shim now mirrors browser behavior (cancel/close events, focus into dialog, focus return on close).
- Pre-existing flaky e2e noted, not fixed: `smoke.spec.ts:195` expects 7 `.live-panel .recharts-yAxis` but the count drops to 6 whenever a live panel's feed has ≤1 data point (sparklines render only when `points.length > 1`); it passed on the final run. Home-page live panels, not webcams - ticket 04's audit or a home-page ticket should make the assertion data-robust.