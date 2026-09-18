# 04: Daily outlook alert — tonight at the stored place

**What to build:** one place-local morning–lunch push per day naming tonight's expected Kp and the darkest window at the stored geocoded place (e.g. "Tonight Kp 4 expected. Darkest at Piteå 22:38–02:23."); silence on quiet days; tomorrow night's outlook once past dawn.

**Blocked by:** 02 (Push foundation).

**Status:** done

- [x] The outlook uses the Kp forecast plus the same darkest-window computation as the app, rendered in the stored place's timezone with the place short name in the copy.
- [x] Nothing is sent when no threshold-relevant activity is forecast (no "nothing tonight" pokes).
- [x] After local dawn the outlook describes the coming night, never the one just past.
- [x] A phone offline at send time receives the newest outlook on reconnect (day-scale time-to-live, collapse by event key — never a flood of stale days).

## Comments

### Implemented 2026-09-18 (agent, awaiting human review — NOT committed)

TDD seams (agreed with user): (1) a new pure matcher `src/push/daily-outlook.ts`
unit-tested over the parsed Kp forecast, the stored place + IANA zone and the
seen keys, and (2) the existing `runPoll` seam in `src/push/handlers.ts` for
the fan-out scenarios — the same two seams as ticket 03. Each landed RED
first, then minimal GREEN.

**Decisions agreed with the user up front:**

- Send window: fixed place-local 06:00–12:00 ("morning–lunch"); the outlook
  always describes the coming night (today's darkest window), so it is never
  the night just past.
- Quiet-day rule: threshold-gated, same as every Kp number in the sender —
  the outlook pokes only when the next-24h forecast breaches the chaser's
  own Alert threshold (the canonical "Tonight Kp 4 expected" copy is a
  chaser whose threshold is 4).
- Midnight-sun days (darkest window is polar day) stay silent; deep
  polar-night days still send with "Darkest at {place}: all day."

**New module:**

- `src/push/daily-outlook.ts` – the Daily outlook matcher. It reuses the
  app's own seams (spec testing decision): `forecastBreachInNext24h` for the
  threshold gate (the same selection the Kp alert's forecast leg and the
  in-app strip make), `darkestWindow`/`daylightTimes` from `src/data/sun.ts`
  for the window, and the display-time module for all place-local rendering.
  No forked copies.
- Event key: `daily-outlook|{YYYY-MM-DD}` (place-local day) — continues the
  product|datetime key family, no escalation tail (the daily has none). It
  rides as the collapse tag; the `daily` payload kind already carries the
  spec's ~12h TTL, so catch-up is newest-only by construction.
- A quiet morning records no key, so a later forecast revision inside the
  window can still poke; the first successful send records the key and the
  day stays silent after that.

**Shared seams extended (review-driven, both reviewers flagged the same
should-fix):**

- `src/data/sun.ts`: `daylightTimes` gained an optional `referenceZone` —
  the reference day is resolved through the zone's own offset (two-pass
  midnight) instead of the device-local calendar, removing the poll
  runtime's device-TZ assumption entirely. The app's 3-arg calls are
  unchanged.
- `src/products/display-time.ts`: `dayKeyInZone`, `formatClockInZone` and
  `hourOfDayInZone` — explicit-IANA-zone rendering through the one time
  owner, so the matcher formats no Intl of its own.
- `src/push/subscription-settings.ts`: the place timezone is now validated
  as a real IANA zone at subscribe time (the sender never stores a
  half-valid chaser); garbage-zone records are skipped at load.

**Wiring:**

- `handlers.ts`: the fan-out body of `fanOutKp` was generalized into
  `fanOutEvents` (ticket 03's send/prune/retry contract verbatim, plus a
  `pruned` outcome so remaining legs skip a gone record), `fanOutDaily` was
  added on top, and `runPoll` composes both legs per record, keeping the
  record's `seenKeys` current in memory so a single poll can persist both
  legs' keys. Ticket 03's tests pass unchanged.
- `netlify/functions/poll-alerts.mts`: no new feed legs — the daily leg
  reuses the Kp forecast the poll already fetches; only the header comment
  changed.

**Code review (Standards + Spec sub-agents) – all findings fixed:**

- Fixed: all absolute-time rendering moved through the display-time module
  (was three private Intl formatters in the matcher); the device-TZ
  assumption behind the darkest-window reference day removed via the
  `referenceZone` seam (was a documented-but-unpoliced "runtime is UTC"
  comment); the IANA zone validated at subscribe time; named
  `DailyOutlookEvent` interface; stale doc comment and dead `windowLabel`
  branches removed; missing helper JSDoc added; the `en-CA` locale trick
  replaced with `formatToParts`.

**Verification:**

- `npm run typecheck` (app + worker programs): clean.
- Full unit suite: 1099/1100 pass. The single failure
  (`ArrangeModal.test.tsx` → "notes on the Pinned webcams row") is
  pre-existing and unrelated (documented in tickets 01–03; fails
  identically on the pristine tree).
- Push module + sun + display-time suites: all pass (11 new matcher unit
  tests, 8 new poll scenario tests, plus the reference-zone, zone-helper
  and validator pins).

**Manual human steps:** none new — delivery itself stays the real-phone
check from ticket 02's checklist.
