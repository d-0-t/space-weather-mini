# 06: Alert settings UI - three types, Kp explainer, install hint

**What to build:** the alerts settings grow from one threshold slider into three independently toggleable alert types with an understandable Kp threshold: info popup plus a personal latitude tip naming the stored place, and an install hint shown to all mobile users with no disabled buttons.

**Blocked by:** 03 (Kp alert type), 04 (Daily outlook alert), 05 (Live summary-word alert).

**Status:** done

- [x] Daily, Kp, and live alerts toggle independently; the Kp threshold slider keeps working and re-syncs to the sender on every change.
- [x] The hindrance gates' controls and stored shape land here (deferred from ticket 05 by the human's call): a cloud-gate on/off toggle beside its percentage, the no-precipitation toggle, and the darkness band choice (Night, Astronomical Twilight, Nautical Twilight, Any including daytime - Twilight always spelled out); every gate label names the stored place short name ("Cloud at Piteå"). The sender's strict validator and `collectSettings` need the same shape change. (Amended in review 2026-09-19, see comments: the cloud-gate on/off toggle became a percentage-only control defaulting to 100%; the precipitation toggle flipped to the positive "Show aurora alerts when it's raining or snowing" checkbox, on by default; darkness defaults to Any; the group legend reads "Live alert settings at {place}".)
- [x] An info popup beside the slider explains the 0-9 Kp scale and its G1-G5 mapping in one line, using glossary vocabulary.
- [x] A one-line tip names the stored place short name and the Kp that typically brings the oval to it (approximate geomagnetic latitude, Tips rule, never a promise), with a generic fallback when no place is stored.
- [x] An install hint is visible to all mobile users; the Enable button always attempts and routes failures to the Install & Alerts guide (ticket 07).
- [x] All new controls meet the coding-standards accessibility bar (native controls, visible focus, honest copy).

## Comments

### Implemented 2026-09-19 (agent, awaiting human review - NOT committed)

TDD seams (confirmed with the user before the first test): (1) the gates shape
(`HindranceGates` + validator + `gatesPass`), (2) a new pure persistence
module `src/push/alert-settings.ts` over injected storage, (3) the existing
`collectSettings` seam in `subscribe-client.test.ts`, (4) a new pure tip
builder `kp-tip.ts` over the reach seams, and (5) the component seam in
`Alerts.test.tsx` / a new `AlertsDialog.test.tsx` for the draft Apply model.
Each landed RED first, then minimal GREEN.

**Product calls agreed with the human up front:**

- Failure routing: the enable-failure panel is copy only, NO link yet - the
  Install & Alerts guide link lands with ticket 07 (the panel's shipped copy
  therefore names only the About section's existing install steps, never a
  destination that does not exist).
- Dialog Apply semantics: the draft extends to everything - Apply commits
  threshold + toggles + gates as one change (one store, one sender
  overwrite POST); Cancel, X, Escape and the backdrop discard all three.
- Cloud percentage: range slider 0-100, step 5 (the Kp-slider pattern).

**New/changed modules:**

- `src/push/subscription-settings.ts` - `HindranceGates` gains `cloudGate`
  (the on/off toggle beside its percentage); the strict validator requires
  it; `DEFAULT_GATES` rides it (all gates on). The toggle and gate parsers
  are now exported (`parseAlertTypes` / `parseHindranceGates`) so the
  client's loader validates through the same functions, never a fork.
  New `migrateSubscriptionSettings` backfills `cloudGate` on records stored
  before this ticket - without it the strict validator would drop every
  pre-ticket-06 record from every poll (the maintainer's own subscription
  would have silently gone quiet).
- `src/push/alert-settings.ts` (new) - the chaser's persisted background
  alert settings (three type toggles + gates) under versioned
  `sw:alert-settings:v1`; defaults on missing/corrupt storage. The gate
  validator is the sender's own.
- `src/push/subscribe-client.ts` - `collectSettings` rides the stored
  settings (toggles + gates) instead of hardcoded defaults.
- `src/push/live-events.ts` - `gatesPass` honors `cloudGate`: an off cloud
  gate never judges the sky (test pinned with 100% cloud passing).
- `src/data/reach-cities.ts` - `approxGeomagneticLatitude(lat, lon)`, the
  one runtime computation of the file's own centered-dipole formula, pinned
  by tests against the table's precomputed rows AND the IGRF-14 spot checks
  (independent source of truth).
- `src/components/pages/home/components/Alerts/kp-tip.ts` (new) - the tip:
  the smallest integer Kp (clamped 1-9) whose `reachEdge` reaches the
  place's |MLAT|, reusing `reachEdge` (the Possible locations panel's own
  seam); copy hedges "typically", and places even Kp 9 never reaches get
  the honest "Even Kp 9 rarely brings the oval to {place}."
- `AlertsContext.tsx` - stored `alertTypes`/`gates` state; setters persist
  + re-send (the every-change path); `applySettings` commits threshold +
  toggles + gates as one change; a granted permission that still fails
  subscribe/store now sets an honest `pushFailed` state (was swallowed).
- `Alerts.tsx` - three independent checkboxes (Daily outlook alert / Kp
  alert / Live alert), the gates fieldset with place-named labels (Cloud
  gate toggle + limit slider, Precipitation checkbox, Darkness select with
  Twilight spelled out), the Kp-scale explainer popover beside the slider
  (one line, glossary vocabulary), the place tip with the generic
  Possible-locations fallback, the mobile install hint, and the
  enable-failure panel with Try again.
- `AlertsDialog.tsx` - the draft extends to every setting; Apply commits
  via `applySettings` (one POST); Cancel/X/Escape/backdrop discard.
- `HelpPopover.tsx` - the body now mounts inside a `dialog` ancestor when
  the trigger sits in one: a body- or main-portalled popover would paint
  behind the modal dialog's top layer and never be seen. All existing
  popover behavior and tests unchanged.

**Accessibility:** native controls (checkboxes, range, select), every
control named by its visible label (no `aria-label`), the failure panel
mirrors the denied-permission warning pattern (aria-describedby), focus
moves to the status that replaced the control (the granted/denied pattern
extended to the failed-enable retry, landing on "Background alerts on."),
the install hint is never a disabled button, and the dialog passes the
alerts-a11y axe audit.

**Code review (Standards + Spec sub-agents) - all findings fixed or argued:**

- Fixed: the duplicated gate/toggle validators extracted into the sender's
  exported parsers (client loader reuses them); `applySettings` composed
  from `commitAlertSettings` instead of re-assembling its body; the inline
  `sw:local-conditions:place:v1` literal replaced with `PLACE_STORAGE_KEY`;
  `DARKNESS_OPTIONS` derived from the validator's own `DARKNESS_BANDS` +
  a label map (order cannot drift) and the select's `as DarknessBand` cast
  dropped (unknown options ignored); the near-identical fieldset SCSS
  extracted into shared placeholders; the failure copy no longer names the
  not-yet-existing "Install & Alerts guide" (true-today copy: "the install
  steps are in the About section"; ticket 07 retargets); the generic
  fallback tip corrected to "names the towns inside the oval's current
  reach" (the panel judges the current Kp, not every level); the
  pre-ticket-06 record migration above (the review's most substantive
  find: without it old records failed the strict validator and vanished).
- Argued (kept deliberately): "Any (including daytime)" carries the
  parenthetical per user story 11's own phrasing (the ticket's bare "Any
  including daytime" reads worse as a bare option); the Try again button
  on the failure panel is one affordance past the spec's minimum, but a
  panel with no action is the dead end story 16 forbids - the guide link
  replaces it in ticket 07; the HelpPopover portal change and the
  live-events gate honor are the necessary carriers of the shape change;
  the install hint's visibility rides `(hover: hover) and (pointer: fine)`
  (hide on fine-pointer, hover-capable desktops) - CSS cannot detect
  "mobile" honestly and UA sniffing is worse; touch-capable laptops with a
  fine primary pointer lose the hint, which matches their desktop-context
  usage.
- Noted for ticket 07: the failure panel's copy and its Try again
  affordance are the seam the guide link replaces; the "Install & Alerts"
  term enters CONTEXT.md only when the guide ships.

### Review UX pass 2026-09-19 (human's call, still NOT committed)

The human re-specified the Live alert's controls in review; each change
landed RED first (updated expectations), then GREEN:

- The fieldset legend reads "Live alert settings at {shortName}" (was
  "Live alert gates at {shortName}"), with a horizontal divider between
  the background alert types and the Live alert's settings group; the
  rain checkbox leads the group, and the two "Only show alerts when..."
  rows ask with a colon and stack their control below the label.
- The cloud gate is the percentage alone - "Only show alerts when cloud
  coverage is below" beside the slider, no on/off checkbox. `cloudGate`
  left the `HindranceGates` shape entirely, so the session's earlier
  backfill migration (`migrateSubscriptionSettings`) died with it: the
  strict validator ignores unknown stored fields, so pre- and post-review
  records both load unchanged.
- The precipitation toggle flipped to the positive checkbox "Show aurora
  alerts when it's raining or snowing" - ON by default, meaning the
  stored `noPrecipitation` flag flips its default to false: rain and snow
  never withhold until the chaser unticks the box. The checkbox presents
  the affordance, the stored flag stays the withhold rule.
- The darkness band is "Only show alerts when it's at least this dark"
  with the select, no checkbox, Any (including daytime) by default.
- Defaults are permissive overall: `DEFAULT_GATES` is now
  `{ cloudMaxPercent: 100, noPrecipitation: false, darknessBand: "any" }`
  - the Live alert is word-driven until the chaser tightens a gate. This
  supersedes the spec's "all gates default on" by the human's call, and
  CONTEXT.md's "Hindrance gate" entry records it.

**Verification (after the UX pass):** typecheck clean; push + Alerts +
HelpPopover + reach-cities suites all green (133 push tests); full unit
suite re-run below; `vite build` unchanged.

**Manual human steps:** none new. The maintainer's stored record carries
the old shape's fields and keeps parsing untouched.

**Verification:**

- `npm run typecheck` (app + worker programs): clean.
- Full unit suite: 1158/1159 pass. The single failure
  (`ArrangeModal.test.tsx` - "notes on the Pinned webcams row") is
  pre-existing and unrelated (documented in tickets 01-03; fails
  identically on the pristine tree).
- Full Playwright suite: 104 pass; the single failure
  (`arrange-modal.spec.ts` - axe with the dialog open) fails identically
  on the pristine tree (verified by stashing this change).
- `alerts-a11y.spec.ts` + `offline.spec.ts`: all pass (the reworked modal
  passes axe with every new control present).
- `vite build`: injectManifest unchanged (20 precache entries).

**Manual human steps:** none new - delivery stays the real-phone check
from ticket 02's checklist. The maintainer's stored subscription keeps
working unchanged: the strict validator ignores unknown stored fields,
so records saved before the review UX pass load as-is.
