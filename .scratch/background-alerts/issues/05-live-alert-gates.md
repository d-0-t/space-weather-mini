# 05: Live summary-word alert with configurable hindrance gates

**What to build:** a background alert type driven by the Summary's shared verdict word (imported, never forked — Summary improvements automatically improve alerts), gated by the chaser's per-hindrance settings at the stored geocoded place. This type speaks words; the Kp alert speaks numbers; the two are never mixed.

**Blocked by:** 02 (Push foundation).

**Status:** done

- [x] The trigger reuses the app's shared grading functions as the single source of the verdict word; the poke copy describes with the word but decides by the shared rule.
- [x] Three gates, each individually toggleable and all default on: cloud cover under the chaser's own percentage (default under 50%), no precipitation, darkness at or darker than the chosen band. (The cloud gate's on/off toggle is a settings-shape change deferred to ticket 06 with the UI, per the human's call this session; the gate itself evaluates on every poll against the stored percentage, precipitation toggles via `noPrecipitation`, and darkness via the band choice where Any = never blocks.)
- [x] Darkness choices are Night, Astronomical Twilight, Nautical Twilight, and Any (including daytime) — Twilight always spelled out.
- [x] Every gate label names the stored place short name ("Cloud at Piteå"); cloud/precipitation reuse the Local conditions weather contract, darkness reuses the darkest-window computation. (The gate labels themselves are settings-UI controls — ticket 06; the poke copy already names the place.)
- [x] Stale live pokes die quietly (hour-scale time-to-live); reconnecting phones are never flooded.

## Comments

### Implemented 2026-09-19 (agent, awaiting human review — NOT committed)

TDD seams (confirmed with the user before the first test): the pure
`matchLiveEvents` matcher (word + gates + dedupe), the `darknessPasses`
band classifier, the poll's live fan-out over the send call boundary, the
Open-Meteo precipitation contract extension, and the shared L1 helpers.
Agreed product calls: favorable = the shared word at or above "moderate"
with BOTH drivers (observed Kp + L1 readings) present; re-pokes on word
escalation and after skipped slots (keys `live|{Kp 3h slot}|{word}`),
gate-blocked moments recording nothing so a later clearing pokes once;
darkness judged from the instant's solar elevation; gates shape left for
ticket 06. Each slice landed RED first, then minimal GREEN.

**New/changed modules:**

- `src/products/l1-readings.ts` – the L1 reading helpers
  (`transitMinutes`, `addMinutes`, `latestValue`, `valueAt`,
  `averagedValueAt`) extracted from the live-panels module so the Summary
  and the sender grade the same readings through one seam (the averaging
  discipline is shared, never forked); `live-panels.tsx` re-exports keep
  every existing import and test working.
- `src/push/live-events.ts` – the Live alert matcher:
  `sharedVerdictWord` mirrors the Summary's default selector rule exactly
  (newest observed Kp + speed/density/Bz averaged around the instant
  arriving at Earth now; the freshest-row null guard and the all-three-L1
  -readings rule match the Summary's `l1IntervalText` no-data path);
  `isFavorableWord` is the one favorable rule (pivot "moderate");
  `darknessPasses` classifies the solar elevation against the chosen band
  (−6/−12/−18 thresholds, Any always) via `solarElevationDegrees` from
  `src/data/sun.ts` — the same solar model `darkestWindow` cuts its
  windows from; `matchLiveEvents` runs the gates then the slot escalation
  (reusing `SLOT_MS`, `slotString`, `newestObservedPoint` from
  kp-events). Gate-blocked moments record nothing; carries record silent
  markers only on open polls; escalation/skip rules mirror the Kp alert.
- `src/push/handlers.ts` – `fanOutLive` joins the poll loop: the word is
  graded BEFORE the weather fetch (a chaser whose word is below favorable
  is never weather-fetched), the weather is read per live-enabled record
  at the chaser's own stored place, a failed fetch withholds the leg
  quietly, and pokes go out at the live kind's 1h TTL with the event key
  as collapse tag. `PollFeeds` gains the two L1 legs (`wind`, `mag`), and
  `fetchWeather` is a required dep — a sender wired without it is a type
  error, not a silent never-poke.
- `src/data/weather.ts` – the Local conditions contract gains the current
  `precipitation` variable: requested in the URL, mapped as
  `precipitationMm: number | null` (null when a payload predates the
  variable, so the captured Kiruna fixture stays valid and an unknown sky
  withholds rather than guesses). `numberFieldOrNull` keeps the optional
  read in one place. The weather card does not render it yet.
- `netlify/functions/poll-alerts.mts` – the poll now reads four NOAA legs
  (observed + forecast Kp, RTSW wind + mag) and maps `fetchWeather` from
  the shared `fetchWeather` contract.

**Copy:** the poke speaks the word, never a Kp number: title
"Aurora looks {word} at {shortName}", body "The shared verdict word turned
{word}; the sky at {shortName} passes your gates."

**Code review (Standards + Spec sub-agents) – all substantive findings
fixed:**

- `SLOT_MS` deduplicated (exported from kp-events, imported by
  live-events) instead of a second copy.
- The unknown-precipitation `(mm ?? 1) > 0` magic replaced with an
  explicit `=== null` withhold branch.
- `weather.ts`'s inline finite-number guard extracted to
  `numberFieldOrNull`.
- The Summary's freshest-row null rule mirrored in `sharedVerdictWord` (a
  trailing null-speed row now silences the leg instead of anchoring "Now"
  at the freshest measurement), and the density reading is required like
  the merged L1 sentence's no-data rule (tests pin both).
- `fetchWeather` made a required poll dep; the word gates the weather
  fetch (below-favorable chasers are never fetched; tests pin both).
- The "dipped below favorable and returned" test renamed to what it
  actually verifies (a slot gap re-pokes; a dip is indistinguishable from
  an outage by the stored keys alone — the honest wording).
- Em dashes in new files replaced with en dashes (the en-dash lint test).
- Kept deliberately: per-file test fixtures (the repo's test style);
  `poll-alerts.mts` mapping weather fields in the adapter (an adapter's
  job); the fan-out deps shape (pre-existing pattern, followed for
  consistency).

**Deferred (argued, not forgotten):** the cloud-gate on/off toggle and
the per-gate settings labels arrive with ticket 06's UI (the settings
shape stays untouched this ticket, per the human's call); the weather
card still shows only the fields it always has.

**Verification:**

- `npm run typecheck` (both programs): clean.
- Full unit suite: 1130/1131 pass; the single failure is the known
  pre-existing `ArrangeModal.test.tsx` → "notes on the Pinned webcams row"
  (documented in tickets 01/02; fails identically on the pristine tree).
- `vite build`: injectManifest unchanged (20 precache entries).
- `npx playwright test e2e/offline.spec.ts`: 5/5 pass.

**Manual human steps:** none new. The maintainer's stored subscription
keeps working (the gates shape did not change; the live leg just starts
evaluating). Real-device poke checks ride ticket 02's existing checklist
whenever the sender is next deployed.
