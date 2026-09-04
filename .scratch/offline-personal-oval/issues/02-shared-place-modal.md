# 02: One place for the whole app (shared PlaceFinder modal)

**What to build:** Home and `/conditions` share one stored `geocoded place`. Both show an `icon+shortName` button that opens the same modal; picking a town in either place updates both, and `Find my location` is a one-shot.

**Blocked by:** 01

**Status:** done

- [x] New reusable `PlaceFinder` modal component (search input, `Search` on Enter, up to five Nominatim matches with `display_name`, `© OpenStreetMap contributors` attribution, `Find my location` button)
- [x] Single storage `localStorage["sw:local-conditions:place:v1"]` versioned, default `Östersund, Sweden` when empty; `device location` via `getCurrentPosition({enableHighAccuracy:true, timeout:8000, maximumAge:60000})` + Nominatim reverse (fallback `My location`), `±{Math.round(accuracy)}m` shown and `>200m` warning, only becomes stored place on confirm
- [ ] Home `AuroraNow` header shows `icon+shortName` button (icon-only + `sr-only` on narrow) that opens the modal — deferred to ticket 05 (see Comments 2026-09-04); `/conditions` large place section refactored to the same button+modal
- [x] Nominatim queried only on Enter, `limit=5`, `addressdetails=1`, 1/s cap respected, no per-keystroke calls per ADR-0005
- [x] Component test: button renders, opens modal, Enter mocks Nominatim at URL boundary and shows five matches, `Find my location` mocks `geolocation` success/deny/absence and `±m`, picking writes the single key and is readable from both routes, focus trapped in modal

## Comments

Implemented 2026-09-04 via TDD (red→green slices), then two-axis code review. Suite green: `tsc --noEmit`, 580 Vitest (64 files), Playwright not re-run in this session (no page journeys touched beyond the AuroraNow header adornment).

- **Shared modal** — `src/components/PlaceFinder/PlaceFinder.tsx`: `icon+shortName` trigger (`btn--secondary` + `btn__label`, collapses to icon-only below 1000px via `index.scss`) opening one native `<dialog>` `Change location` modal via `showModal()` (focus trap is native, matching `FullSizeModal`; open moves focus to the search field). Search runs only on form submit (Enter or Search tap, never per keystroke); radio pick list of up to five matches with manual activation (arrow/Home/End move focus, Enter/click picks); ODbL attribution; single-shot `Find my location` proposing the fix with `±m` + `>200m` warning and `Use this location` confirm only.
- **Single store** — `src/components/PlaceFinder/useGeocodedPlace.ts`: both Home and `/conditions` read/write the one versioned key `sw:local-conditions:place:v1` (default Östersund persisted on first open). `src/data/short-display-name.ts` moved out of the conditions page so both callers share it; `src/data/geocoding.ts` carries the fix `accuracy` through `getDeviceLocation`.
- **Home integration (this session)** — `AuroraNow.tsx` calls the shared hook and renders the same `PlaceFinder` in the panel header adornment next to the moon badge (all three states: loading/error/loaded), plus `.aurora-now__adornments` flex in `AuroraNow.scss`. `/conditions` header refactored to the same button+modal (prior WIP).
- **Test seams** — `PlaceFinder.test.tsx` (15 tests: trigger, open/close, focus-into-modal + `aria-labelledby`, Enter-only URL-boundary params, five-match pick, no-match/busy/failed, device-fix propose/confirm with `±m`, `>200m` warning, `My location` fallback, deny/absent, attribution, Kiruna hand-off); `AuroraNow.test.tsx` (3 new: seeded-Oslo read proving the shared key, trigger+modal open, pick writes key and updates button); `conditions.test.tsx` updated to open the modal from the header button. `GeolocationStub` now requires `accuracy` so the `±NaNm` path cannot typecheck.
- **Review fixes (this session)** — Standards: no hard violations; extracted `pickAndClose` (duplicated `onPick+close` smell). Spec: band/`(i)` line is ticket 05 scope (not this ticket); Search button/backdrop/radio-roving kept as justified (touch/mouse submit, FullSizeModal precedent, WCAG manual activation); radio `onClick` kept as established pattern (fires for Space too).
- **Awaiting human review — not committed.** `git status` holds the working tree (new `src/components/PlaceFinder/`, edited `AuroraNow.*`, `conditions.*`, `geocoding.*`, `short-display-name`, `nominatim-test-utils`, tests, this file).

## Comments (2026-09-04 follow-up, user review round)

- **Home placement removed** — the `AuroraNow` header button had no meaning without the view-distance band, so it is out again (`AuroraNow.tsx` back to moon badge only, `.aurora-now__adornments` SCSS and the three `AuroraNow` place tests reverted). The shared hook/store stay single-key, so ticket 05 can re-attach Home via its `Aurora ~band from [shortName] (i) • Update location` line. Home bullet above unchecked to match.
- **Trigger order kept as edited** — flag now sits right of the location text (`LocationOnIcon`, label, flag); no code change needed.
- **Close button anchored to the modal** — `place-finder__close` was `position: fixed` (viewport top-right); now `position: absolute` against the positioned dialog box, heading keeps its right padding so text never slides under it.
- **Staged Apply flow (TDD red→green)** — selecting a match (click/Enter/Space) or the device fix (`Use this location`) only stages it into `pending` (radios are controlled `checked` + `onChange`; new searches clear the stage). Nothing is stored until `Apply and close` (disabled while nothing staged, with a `Selected: {displayName}` status line); `Cancel` and the X button `reset()` + close, discarding the stage and the typed query while the stored place stays untouched. Backdrop/Escape still discard via `onClose={reset}`.
- **Tests** — `PlaceFinder.test.tsx` (16: stage-without-close, Cancel-resets-clean, device stage-then-Apply, fallback-then-Apply, Kiruna-on-Apply, close-inside-modal); `conditions.test.tsx` updated (stage-then-Apply for arrow/Enter, radio pick, device fix, daylight+links). Suite green: `tsc --noEmit`, 578 Vitest (64 files). Still not committed — review first.
