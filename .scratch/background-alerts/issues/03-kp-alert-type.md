# 03: Kp alert type — observed 3-hour value plus 24h forecast

**What to build:** background pokes when the official 3-hour Kp value or the Kp forecast breaches the chaser's Alert threshold, each honestly labeled observed vs predicted, re-poking on escalation only.

**Blocked by:** 02 (Push foundation).

**Status:** done

- [x] A breach on either leg (observed 3-hour value, forecast within 24h) sends one poke per event, labeled so observed and predicted can never be confused.
- [x] A rising Kp for the same event re-pokes once per escalation step; an unchanged or easing event stays silent while the in-app strip still updates.
- [x] Events are deduped by the existing product/issue-datetime key family; a repeat poll without change sends nothing.
- [x] Scenario tests cover breach, escalation, repeat-poll silence, and below-threshold quiet over canned NOAA payloads.

## Comments

### Implemented 2026-09-18 (agent, awaiting human review — NOT committed)

TDD seams (agreed with user): (1) a new pure matcher `src/push/kp-events.ts`
unit-tested over the parsed NOAA legs, and (2) the existing `runPoll` seam in
`src/push/handlers.ts` for the scenario tests (breach, escalation,
repeat-poll silence, below-threshold quiet, toggle-off, gone-pruning,
failed-send retry). Each landed RED first, then minimal GREEN.

**New module:**

- `src/push/kp-events.ts` – the Kp matcher over the parsed NOAA legs. It
  reuses the app's own seams (spec testing decision): `parseTimeTag` for all
  slot math and `forecastBreachInNext24h` for the forecast leg — no forked
  copies, the parsers' own fixture tests own the raw JSON.
- Event keys continue the `product_id|issue_datetime` family, canonicalized
  to `{product}|{YYYY-MM-DDTHH:MM:SS}|Kp{step}`: `noaa-planetary-k-index`
  (observed leg) and `noaa-planetary-k-index-forecast` (forecast leg). The
  `|Kp{step}` tail is the spec's "escalation re-pokes move the key forward"
  clause; `step` is the integer Kp level (`floor(kp)`), so a station-update
  flicker inside one G-band (5.33 → 5.67) never re-pokes, and a step up
  (5.33 → 6.33) does.
- Copy speaks Kp numbers only: title `Kp 5.33 Observed` / `Kp 5.67
  Predicted`, body naming the product that says it. No verdict words, no
  storm-scale words.
- The observed leg evaluates only the newest observed point (the current
  official 3-hour slot): 30 days of history never poke, and a poke always
  speaks about the current slot, so a poke is never stale.
- The forecast leg speaks about the strongest breach in `(now, now + 24h]`
  — the same selection the in-app strip makes.

**Matching rules (the state machine, pinned by the unit tests):**

- Event with unseen key whose step exceeds the last evaluated step of its
  slot, or of the immediately preceding slot (a storm carrying across slots
  at one level) → poke.
- Slot skipped since the last event (storm dipped below threshold, or a
  forecast revision moved the strongest slot) and the previous event has
  expired → a new episode → poke.
- Unchanged or easing step → silent; the slot's step is still recorded (a
  "chain marker", `poke: false`) so the episode survives silently across
  polls and the next escalation still pokes.
- A stalled poll schedule (sender dark for several hours while the storm
  continues) re-pokes at most once on the reconnecting poll — the catch-up
  behaviour of spec story 19, never a flood.

**Wiring:**

- `runPoll` (handlers.ts) now fans out: one poke per breaching event per
  record, deduped against the record's own `seenKeys`, sent through the
  existing send call boundary. Successful sends (2xx) append the event's
  key via the store; a gone response (404/410) prunes the record; any other
  failure records nothing so the next poll retries.
- The poll adapter `netlify/functions/poll-alerts.mts` now fetches exactly
  the two parsed Kp legs (observed + forecast). The ticket-02 skeleton's
  dead alerts.json and scales legs are dropped: the fan-out reads only what
  it matches on, and tickets 04-05 extend `fetchFeeds` with their own legs
  (a one-line addition each, the dep-injection shape the foundation pinned).
- The store's `save` seam gained an optional third argument,
  `seenKeys`: the every-change overwrite path omits it (state kept, the
  subscribe path unchanged) and the poll supplies the new dedupe state
  through it. Still exactly the 3-method seam (spec maintainer story 23).

**Code review (Standards + Spec sub-agents) – all findings fixed or argued:**

- Fixed: TZ pin (`process.env.TZ = "UTC"` first statement) added to both
  new time-driven test files; `kpEventKey` is now the single key-shape
  builder (`evaluateSlot` had a duplicate inline build); the repeated
  inline feed-shape types in handlers.test.ts replaced with the `PollFeeds`
  type; `polledDeps`/`polledDepsState` renamed to `freshPoll`/`repeatPoll`
  so the difference reads from the names; `vi.stubEnv` cleanup added
  (afterEach unstub, the repo's pattern).
- Argued (kept deliberately): the observed leg evaluates only the newest
  slot (a poke never speaks about a stale 3-hour value; a skipped slot's
  breach arrives only via the catch-up re-poke, matching story 19); a
  multi-step jump sends one poke at the new step, not one per band crossed
  (story 3's "only when the storm escalates"); dedupe keys stay strings
  because the persisted key family is a string contract shared with
  `alertKey`; scenario tests use parsed points (the parsers' raw fixtures
  are pinned once in the products' own suites, per the spec's
  "reuse the highest seams" testing decision); the alerts/scales leg
  removal is the no-speculative-features reading of the foundation's
  counting skeleton, documented above.
- One related test fixed en route: `subscribe-client.test.ts`'s
  "refuses to subscribe without the app-server key" broke the moment a
  developer's local `.env` (the maintainer's manual VAPID step from
  ticket 02) set `VITE_VAPID_PUBLIC_KEY`; the test now stubs the env var
  off so the contract is hermetic.

**Verification:**

- `npm run typecheck` (app + worker programs): clean.
- Full unit suite: 1077/1078 pass. The single failure
  (`ArrangeModal.test.tsx` → "notes on the Pinned webcams row") is
  pre-existing and unrelated (documented in tickets 01-02; fails
  identically on the pristine tree).
- Push module suite: 78/78 pass (11 new matcher unit tests, 7 new poll
  scenario tests, the store's new save-with-keys contract).

**Manual human steps:** none new — delivery itself stays the real-phone
check from ticket 02's checklist.
