# 05: Standardized button system + webcams UI polish

**What to build:** A shared button vocabulary (`btn--primary` / `btn--secondary` / `btn--icon`) used across the app, applied to the webcams page: icon+label secondary toolbar buttons with active-state badges and icon-only collapse below ~1000px, icon-only Hide buttons, a primary Apply in the filter dialog, a cadence-bearing auto-refresh label, a non-full-width live cam, and `webcams__jump`-styled Jump to top links. Also split `webcams.tsx` into per-component files.

**Blocked by:** 03

**Status:** done

- [x] `webcams.tsx` is split: image card, live card, shared card parts (title/image/attribution/Hide button + base props + small helpers), filter dialog, hidden sources dialog each in their own file under `src/components/pages/webcams/`; the page keeps state, filtering, hiding and layout (809 → 468 lines)
- [x] A global button system in `index.scss`: `btn--primary` (green CTA), `btn--secondary` (browser-alerts style), `btn--icon` (Astro-mode style, 44px min, emoji-only), plus `btn__label` (visible label that collapses to sr-only below 1000px) and `btn__badge` (red corner dot, `--color-status-red`); the Astro toggle, the browser-alerts button and the Compact view toggle adopt the shared classes
- [x] Toolbar: Refresh, Filter, Hidden sources and the auto-refresh setting are secondary-styled with icons (🔄 🔍 👁 🔴), a `title` attribute and an sr-only-capable label span; below 1000px only the icons show
- [x] The auto-refresh label carries the refresh time frame derived from the refreshable registry cadences ("Auto-refresh images (1–15 min)"; single value as "60s"/"N min") instead of the bare data-use copy; the data-use honesty moved to the checkbox `title`
- [x] Filter and Hidden sources buttons show a red corner dot while active (a filter is applied / anything is hidden)
- [x] Every Hide button (image card, live card, Twitch card, link row) is `btn--icon` with a crossed-out-eye glyph (🙈), `title` + `aria-label` with the station name, and an sr-only "Hide" span – extracted as the shared `WebcamHideButton`
- [x] In the filter dialog Apply is `btn--primary`; Show all / Hide all / Cancel are `btn--secondary` (the hidden-sources dialog's Show / Show all / Close follow)
- [x] The live cam card no longer spans the full row (`width: fit-content`, like the Twitch card); Jump to top links use the `webcams__jump` pill class
- [x] Typecheck, build and the unit suite are green (377 passed); the webcams, Nav, Home and Alerts tests pass with the class/name changes

## Comments

Implemented 2026-08-29. Notes and deliberate deviations:

- **UAF "does not seem to load" is by design, not a bug.** Probed live 2026-08-29: the SSE endpoint returns 200 with `Access-Control-Allow-Origin: *`, the daytime placeholder and night frame URLs both return 200. In daylight the operator's feed serves the placeholder frame (the card's note explains it); at night the live frames flow while auto-refresh + Live updates are on. The card also no longer spans the full row.
- **Icons are Material UI SVG components, not emoji** (user follow-up 2026-08-29): `@mui/icons-material` + `@mui/material` + emotion peers installed (bundle +~28 kB gzip). Refresh = `RefreshIcon`, Filter = `FilterListIcon`, Hidden sources = `VisibilityOffIcon`, auto-refresh live dot = `FiberManualRecordIcon`, Astro = `DarkModeIcon`, Hide = `VisibilityOffIcon` — which is a genuine crossed-out eye, replacing the 🙈 stand-in.
- **`btn__label` now applies to Astro mode and Hide too** (user follow-up): on wide screens the moon/Hide buttons show their text; below 1000px everything collapses to icons (`.btn--icon` goes square again under the media query).
- **Auto-refresh label is flex-reversed** (checkbox right, like Compact view; DOM order input → label → icon with `row-reverse`) and reads **"Auto-refresh (1–15 min)"** (the cadence range, "images" dropped).
- **Cadence label is a derived range.** There is no single refresh interval (per-card cadences range 1–15 min in the registry), so the label shows the refreshable range "Auto-refresh (1–15 min)"; a single value renders as "60s" (when 1 min) or "N min" – per the user's "60s or mins if over 60s" directive. The honest "uses data" note lives in the checkbox's `title`.
- **`title` + accessible-name quirk discovered**: in the test stack (dom-accessibility-api), a `title` attribute overrides the button/label text as the accessible name. Toolbar buttons therefore carry an explicit `aria-label` (count-bearing) that wins over the title, and the auto-refresh `title` sits on the `<input>` (the label text names the checkbox). Verified by probes.
- **Palette extension**: `--color-status-red` joins gold/orange as a status accent (ADR-0002 and CONTEXT.md updated); the shared `btn--*` layer is recorded as the BEM exception in coding-standards.md.
- **Pre-existing test tripped**: the Twitch iframe's `getByTitle(/night sky live/i)` now matches the Twitch card's Hide button title too – the iframe queries are exact-match now.

### Follow-up (2026-08-29, same session)

- **Auto-refresh pill lost its live-dot icon** (user follow-up): the setting is now a plain checkbox pill like Compact view.
- **UAF note removed** ("Night-only – placeholder frame in daylight", user follow-up): the freshness line's "placeholder frame" wording already covers the state; the live entry's `note` is now null. The Live updates toggle is also hidden while the feed is failed (only the fallback note shows).
- **Live updates toggle restyled** like the auto-refresh/Compact-view checkbox pills (`btn--secondary`, checkbox right via `row-reverse`) and moved into a wrapping `.webcam-card__actions` row with the Hide button.
- **Freshness copy**: image cards read "Loaded HH:MM · Refreshes every N min" (no "operator") with the seasonal/staleness note appended inline – "Loaded 23:04 · Refreshes every 1 min · Operates when dark". The separate note paragraph on image cards is gone (Twitch card keeps its note).
- **Card layout**: `.webcam-card` is a flex column; Source attribution + Hide pin to the bottom (`margin-top: auto`), so uneven image heights no longer leave ragged card bottoms.
- **HTTP-only link rows**: the kind note is now just "Webcam" and the redundant mixed-content row notes were removed from the registry (the research doc still records the reason).
- **"Looking for more?"** is now one line – "Looking for more? The EarthCam world map finds webcams from around the world." – the coverage-gaps litany is gone.

### Follow-up (2026-08-31, same session)

- **`btn--icon` reintroduced as transparent** (commit 0d1179b): `index.scss` unified `.btn--primary/--secondary/--icon` base to `min-height 44px` shared chrome; `btn--icon` is transparent `color: var(--color-gray)` → `var(--color-accent-strong)` on hover, no background/border. Hide migrated from `btn--secondary` to `btn--icon` `VisibilityOff` small in the card title row.
- **Hide asymmetrical touch target** (commit 0d1179b, now documented): `.webcam-card__hide` is intentionally asymmetrical (`padding:0; margin:-1.35rem -1.75rem 0 0; justify-content:flex-start; align-items:flex-end; text-align:left`) for a larger hit area away from the cam image (top-right overhang), per user request. This survives the pin redesign.
- **Pin selector redesign** (this ticket, user request 2026-08-31): `WebcamPinToggle` no longer renders a `Pin {name} webcam` text checkbox at the card bottom. It now renders a single `label.btn--icon.webcam-card__pin` in the title row (replacing Hide while pinning is active) with a hidden native `input type=checkbox` (`class="sr-only"`), `title` + `span.sr-only` naming the control (WCAG checkbox semantics kept), and a large gold `PushPin` `1.5rem` at `30deg` (`var(--color-gold)` → `var(--color-accent-strong)` on hover) with symmetric padding (unlike Hide). The entire card is the visual selector: `webcam-card--pin-unselected` `1px dashed var(--color-border-muted-transparent)` vs `webcam-card--pinned` `3px solid var(--color-accent-strong)`; focus via `:focus-within` outline. Cards gain the border modifier from `pinMode ? pinned ? --pinned : --pin-unselected`. Short display names in `webcams.ts` (e.g. Yellowknife, Kiruna (IRF)) have original long names preserved as comments.