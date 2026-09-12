# Moon position literals for ticket 02 (plain-language aurora)

Fetched live on 2026-09-12 to pin the unit tests of `src/data/moon.test.ts`
(same pattern as `aurora-local-conditions-2026-09-01.md` pins the sun
literals for `src/data/sun.test.ts`).

## Sources

- **time.now moonrise/moonset calendars** for Oslo and Tromsø, September
  2026 (`time.now/oslo/moon/`, `time.now/tromso/moon/`) — the independent
  source of every literal below. Calendar times are local (CEST, UTC+2).
- **timeanddate.com** was unreachable from this environment during the
  fetch (403); its published Tromsø September 2026 table was visible only
  through search-result snippets. The time.now tables are the pins.
- **suncalc v2.0.1** (`node_modules/suncalc/index.js`) is the app's
  ephemeris dependency. Its README claims rise/set accuracy of ~15 s
  against USNO/JPL; against the time.now tables above it lands within
  ~5 min on ordinary days and ~8 min on grazing transition days (the
  2026-09-22 Tromsø rise, where the moon barely clears the horizon and
  solver differences amplify).

## Pinned literals (converted to UTC)

| Place | Local day | Event | Local time | UTC |
| --- | --- | --- | --- | --- |
| Oslo 59.91 N, 10.75 E | 2026-09-15 | moonrise | 13:14 CEST | 11:14Z |
| Oslo | 2026-09-15 | moonset | 19:31 CEST | 17:31Z |
| Oslo | 2026-09-15 | meridian passage | 16:29 CEST, +7.6° | 14:29Z |
| Oslo | 2026-09-16 | moonrise | 14:50 CEST | 12:50Z |
| Oslo | 2026-09-16 | moonset | 19:37 CEST | 17:37Z |
| Tromsø 69.65 N, 18.96 E | 2026-09-11 | moonrise | 06:13 CEST | 04:13Z |
| Tromsø | 2026-09-11 | moonset | 18:52 CEST | 16:52Z |
| Tromsø | 2026-09-11 | meridian passage | 12:52 CEST, +20.5° | 10:52Z |
| Tromsø | 2026-09-12 | moonrise | 08:16 CEST | 06:16Z |
| Tromsø | 2026-09-12 | moonset | 18:27 CEST | 16:27Z |
| Tromsø | 2026-09-16 | meridian passage | 16:44 CEST, −5.3° | 14:44Z |
| Tromsø | 2026-09-30 | meridian passage | 03:14 CEST, +42.4° | 01:14Z |

Polar edge cases the calendar confirms:

- **Moon never rises** at Tromsø 2026-09-15..21: no moonrise all week,
  meridian-passage altitude −1.2° to −8.6° (always below the horizon).
- **Moon never sets** at Tromsø 2026-09-30: no moonrise and no moonset,
  meridian-passage altitude +42.4° (always above the horizon).

Tolerances in the tests: ±6 min for rise/set instants (independent models
disagree by up to ~5 min; the grazing 2026-09-22 Tromsø rise gets loose
structure-only bounds because the sources disagree by ~8 min there), and
±0.5° for meridian-passage altitudes.

## Maintainer notes

- suncalc v2's `getMoonTimes` scans the **UTC calendar day** of the date
  it is passed (`t.setUTCHours(0, 0, 0, 0)` in `index.js`). The README's
  "pass a date at local midnight" advice does not produce a local
  civil-day window under this build: the truncation always picks the UTC
  day containing the instant. `src/data/moon.ts` therefore stitches the
  two overlapping UTC-day scans and keeps only events inside the local
  day window; `moonDayTimes` takes the window start explicitly so tests
  can drive straddling windows with the timezone pinned to UTC.
- Convention split, disclosed in the module JSDoc: rise/set events use
  suncalc's USNO **upper-limb** threshold, while the sky line's
  up/down gate (`isMoonAboveHorizon`) reads the refracted disk-center
  altitude. A moon grazing the horizon can carry events while the gate
  stays below; center-below means negligible moonlight for the "does the
  moon wash out faint aurora" line either way.
- The 2026-09-12 "today" rows (Tromsø 08:16 CEST rise / 18:27 CEST set,
  altitude −18.3° at 02:17Z) came from the time.now header blocks and
  double-checked the same-day calendar rows used as pins.
