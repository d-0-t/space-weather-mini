# 05: View distance band + AuroraNow line + (i) explainer

**What to build:** Home's `Aurora ~band from [shortName] (i) • Update location` line that tells the chaser in a band (not a single km) how far the nearest forecast oval is, with a simple non-technical explainer.

**Blocked by:** 02, 03, 04

**Status:** done

- [x] Pure helper `distanceToNearestAurora(placeLatLon, grid, threshold=6, maxKm=600)` haversine to nearest cell `Aurora ≥ threshold`; `0` ignored, `>600` returns `Not in range`
- [x] Band table rendered in `AuroraNow` under the images: `Overhead / Nearby ~0-100 km • Likely / Distant ~100-300 km • Possible / Far ~300-600 km • Unlikely / Not in range` with confidence; line reads `Aurora ~band from [shortName] (i)` plus `Update location` button opening the shared modal
- [x] `(i)` popup is a `GlossaryTerm`-style explainer with the approved copy: `Each colored square is a 30-min forecast (1°). 0 = no color = no forecast there. 1 faint → 16+ bright. Nearest square ≥6 is the band, not a single km. Cloud/moon/town lights can still hide it. Forecast Time 30-90 min ahead.`
- [x] Threshold stored versioned `sw:view-distance:threshold:v1` for migration; `Forecast Time` used for `As of`

## Comments

Implemented 2026-09-06 via TDD (red → green slices), then two-axis code review with fixes applied. **Not committed — awaiting human review.**

- **Helper** — `src/products/view-distance.ts`: `distanceToNearestAurora(place, cells, threshold = DEFAULT_VIEW_DISTANCE_THRESHOLD, maxKm = 600)` haversine to the nearest cell `Aurora >= threshold` within range; `Aurora 0` and sub-threshold cells ignored; returns `{ band, distanceKm, confidence }`. Band edges (100/300/600) are `upToKm` on the approved `VIEW_DISTANCE_BANDS` table — the table is the single source of truth for both the mapping and the `(i)` popover rows. OVATION boundary artifact rows (lat `0`, `-1`, `90`, `-90`) are excluded via the same `isBoundaryRow` the paint and counts use (moved to `products/ovation.ts` so products own the grid rule); a place near the equator never reads a phantom band off a model artifact.
- **Storage** — `loadViewDistanceThreshold` / `saveViewDistanceThreshold` on injected storage, key `sw:view-distance:threshold:v1` (`{ threshold, v: 1 }`), default 6, clamped 1-25 against the Aurora scale (thresholds.ts pattern). No threshold UI in this ticket — the key exists so a future chaser-set threshold migrates cleanly.
- **Line** — `Aurora {confidence} from [PlaceFinder pill] (i)` with the confidence as the headline (user-approved seam/copy answer; ranges live in the `(i)` table). The pill doubles as the `Update location` button: PlaceFinder gained a backwards-compatible `actionLabel` prop (titled `Update location: {place}`; icon-only + sr-only label on narrow). `As of {Forecast Time} • Updated {age}` (age from `Observation Time`) under the line per the ticket. Shared `useOvationQuery` hook dedupes the OVATION subscription with `OvalGlow`; `fetchOvation` moved to `products/ovation.ts` (data layer owns it, ADR-0003).
- **(i)** — `HelpPopover` with a new optional `footnote` slot: approved copy verbatim (kept the ticket's hyphen `30-90`), band-table rows (`Overhead / Nearby ~0-100 km – Likely` … `Over 600 km – Not in range` — the `>600` outcome renders as the row label `Over 600 km`), and the provenance link to NOAA's aurora 30-minute forecast page.
- **Pre-existing drift repaired in passing (flagged for review):** stale JPG-era tests in `AuroraNow.test.tsx`, `Home.test.tsx` and `Home.dashboard.test.tsx` rewritten against the oval glow / current modals; `Pinned Webcams` heading assertions corrected to `Pinned webcams`; the palette sweep got a frozen carve-out for the oval stage background. Shared `ovationJson` test double extracted (`src/test/ovation-test-utils.ts`).
- **Suite** — `tsc --noEmit` clean; Vitest 646+ green across 69 files (0 new failures, 8 pre-existing failures repaired); `vite build` emits `sw.js`; Playwright not re-run in this session (no page journeys changed beyond Home's panel content).

## Comments (2026-09-06 user review round)

The first pass shipped `Aurora Likely from [pill] (i)`; the user review redesigned it. All findings applied:

- **Line copy** — now `Aurora {band} (i) – {place} [Change location]`: the confidence reads lowercase mid-sentence (`Aurora not in range – Bodträskvägen, Gotthem`), no preposition (`from`/`at` do not work for every band), the place is plain text (`shortPlace` short name), and one `btn--secondary` `Change location` button (icon + label, no flag — PlaceFinder `actionLabel` now renders the trigger as a plain action button) opens the shared modal. The line is a `<div>`, not a `<p>`: the `(i)` popover's `<details>` is not phrasing content, so browsers auto-closed the `<p>` and broke the line apart.
- **(i) placement + flooding** — the `(i)` sits right after the info it explains (was after the pill), and `.view-distance__popover` now positions absolutely like the `.oval-glow__popover` family; it no longer floods the panel as an in-flow text block.
- **No sr-only tables (standing rule, re-confirmed)** — the oval's sr-only per-hemisphere counts table is removed entirely, with `countGlowLevels`/`OvalHemisphere` and their tests; the canvas `aria-label` names the levels. Coding standards updated: a table alternative must be visible to all users, minimized behind an icon button in a modal.
- **Freshness once** — the oval's line shows `Forecast Time {ft} – 30–90 min lead.` only; the single `As of {Forecast Time}. Updated {age}.` belongs to the View distance block (the `•` separator replaced by periods per the user's fix, now the rule: no bullets anywhere — screen readers announce them; coding standards updated).
- **Oval paint** — land fill stays `#444444` (re-confirmed: the oval must read at maximum brightness; a lighter fill washed it out) on the user-restored `rgb(1, 3, 11)` deep-space stage; both recorded as deliberate decisions (ADR-0007), not WCAG contrast claims; the palette sweep carries the frozen carve-out.
- **Suite after the round** — `tsc --noEmit` clean; Vitest 646 green; Playwright (home a11y, smoke, mobile layout, offline) green; `vite build` emits `sw.js`. Still not committed.
