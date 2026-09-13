# 01: Verify the per-G city strings live + decide the element's shape

**Type:** research

**Status:** resolved

**Blocked by:** none

**Question:** Can the app honestly name towns in a "where it may be visible" element, and if so, should it? Read the NOAA Scales explanation live (`https://www.spaceweather.gov/noaa-scales-explanation`, the same page the alerts quote) and capture the verbatim aurora line for every G level — G1 through G5 — with its Kp mapping and geomagnetic-latitude qualifier, noting the fetch date. Cross-check the capture against the Tips on Viewing the Aurora bands (`https://www.swpc.noaa.gov/content/tips-viewing-aurora`) the interpreter already quotes. Then decide: ship a towns element, or record a documented no-go.

**Checklist:**

- [x] Per-G rows captured verbatim (G1–G5: city strings + "(typically NN° geomagnetic lat.)" + Kp mapping), fetch date recorded in the answer — G1 captured as the exception: no latitude qualifier
- [x] Overlap with the Tips bands checked — where the Scales wording and Tips disagree or add a caveat, Tips owns the visibility claim
- [x] The honest construction written out: "may be seen", approximate averages, geomagnetic-not-geographic, no colour promise, no false precision, never a boundary promise over a town (N3/N4/N10)
- [x] The element decision made with the human (ship / no-go) and, if ship: where it lives, how a far-north viewer reads US-state strings, and whether non-US towns are ever named — ship, global, Aurora now under the Kp block
- [x] If ship: the follow-on build ticket published with the confirmed seams; if no-go: the reason recorded here and in the map — `02-global-towns-in-aurora-now.md`

**Bounds:** no copy ships from this ticket; it is verification + decision only. No recalled city string may survive the pass — the capture is the source of truth. No Bortle/SQM numbers, no per-town promises, no editing NOAA wording.

**Deliverable:** an `## Answer` section under this ticket with the captured table, the decision and its reasons, and the map's Decisions-so-far updated with a context pointer.

---

## Answer

**Fetched live 2026-09-14.** Sources: `https://www.spaceweather.gov/noaa-scales-explanation`
and `https://www.swpc.noaa.gov/content/tips-viewing-aurora`. Both pages' own headers
rendered a site clock of "2026-09-09" (page chrome, most likely cached); the fetch
date is 2026-09-14. The recalled US strings held except for one fact the first
reading missed: **G1 has no geomagnetic-latitude qualifier.**

### Per-G rows captured verbatim (aurora clause only)

The full rows also carry power/spacecraft/pipeline effects; only the aurora
clause and its measure matter here.

| Scale | Kp (verbatim) | Aurora clause (verbatim) | Geomagnetic-lat qualifier |
|---|---|---|---|
| G1 Minor | Kp = 5 | "aurora is commonly visible at high latitudes (northern Michigan and Maine)" | **none** (the only row without) |
| G2 Moderate | Kp = 6 | "aurora has been seen as low as New York and Idaho" | "(typically 55° geomagnetic lat.)" |
| G3 Strong | Kp = 7 | "aurora has been seen as low as Illinois and Oregon" | "(typically 50° geomagnetic lat.)" |
| G4 Severe | Kp = 8, including a 9− | "aurora has been seen as low as Alabama and northern California" | "(typically 45° geomagnetic lat.)" |
| G5 Extreme | Kp = 9 | "aurora has been seen as low as Florida and southern Texas" | "(typically 40° geomagnetic lat.)" |

Two wording facts no copy may smooth over: G1 is frequency language ("commonly
visible at high latitudes"), while G2–G5 are historical sighting records ("has
been seen as low as") — neither is a tonight forecast.

### Cross-check against Tips (the visibility owner)

Tips bands already quoted by the interpreter are re-confirmed: Kp 0–2 "far
north, quite dim in intensity, and not very active"; Kp 3–5 "move further from
the poles… brighter… more auroral activity (motion and formations)"; Kp 6–7
"possible to see the aurora from the northern edge of the United States"; Kp 8–9
"may be seen directly overhead from the northern states of the USA". Caveats
verbatim: "approximate and represent averages. There will be times when these
relationships do not hold up exactly" and "holds true in geomagnetic latitude,
not geographic."

Where the two pages part:

1. **Kp 6 conflict.** Scales names New York and Idaho; Tips says only "northern
   edge of the United States". Tips owns the visibility claim; the Scales row is
   an impact-table sighting record.
2. **Latitude numbers drift.** Scales 55/50/45/40° vs the Tips rule
   66° − 2° × Kp → 54/52/50/48°. Different constructs (sighting latitude vs
   modeled oval edge) — never shown as one arithmetic.
3. **No global city strings exist.** Tips' rule is the only global reach rule
   (plus the Europe/Asia and South America maps, no towns); every NOAA town
   string is US-only. The app's non-US default place cannot be served by them.
4. **Tips caveats ride any use:** averages, geomagnetic-not-geographic, sightings
   "hundreds of kilometers (miles) equatorward" of the modeled line, 1000 km
   viewing distance with an unobstructed view, darkness required.

### Honest construction (binding for any shipped towns copy)

"May be seen", never will; approximate averages; geomagnetic latitude, not
geographic; no colour promise; no false precision (no percentages, no km, never
a boundary promise over a town — N3/N4/N10); Kp is a 3-hour planetary average
and revises (K1); absence from any list is never "no aurora there" (sightings
run equatorward of the modeled edge); cloud, moon and light pollution can still
hide it (N7).

### Decision (human, 2026-09-14): ship a global towns element

- **Not US-only, not a no-go.** The Scales strings ship nowhere — US-only,
  record-language, and Tips stays the visibility owner.
- **Construction:** Tips rule + static city geomagnetic latitudes,
  dark-filtered. Reach edge E = 66° − 2° × Kp (geomagnetic); a town shows when
  its approximate |geomagnetic latitude| ≥ E and the sun is at or below −12°
  there (astronomical twilight or darker).
- **Where:** Aurora now, under the Kp block; flag + city + ordinal probability
  (icon, ranked, color, title attrib, alt text), one city per probability per
  country.

### Follow-on

`issues/02-global-towns-in-aurora-now.md` — build ticket with the seams
confirmed in session (mount point, static city array + documented MLAT method,
probability convention, dark gate, dedup/rank, accessibility, glossary term).
