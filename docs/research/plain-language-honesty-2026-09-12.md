# Science-honesty + local-sky inventory for the plain-language interpreter (2026-09-12)

Fact base for wayfinder ticket 02 (`plain-language-aurora`). No design, no build.
Question answered: what can we HONESTLY say per value interval, and what local-sky
data can we fold in? Vocabulary per `CONTEXT.md`; ADRs 0001, 0003, 0005–0008.

Method note: `www.spaceweather.gov` / `www.swpc.noaa.gov` page HTML is
unreachable from this sandbox (CloudFront TCP timeouts; `WebFetch` transport
errors), so page-level wording below comes from (a) search-result excerpts served
from official NOAA hosts, (b) ticket-01 research, which fetched those same pages
live on 2026-09-11/12, and (c) live `services.swpc.noaa.gov` endpoints curled
directly on 2026-09-12. Items one step removed from a primary fetch are marked
**[RE-VERIFY]** — check against the live page before baking into shipped copy.
Nothing in §6 may ship without its source re-checked.

---

## 1. Sourced fact table — solar wind + field (drivers, never verdicts)

All four live in `SolarWind.tsx` + `products/solar-wind.ts` (DSCOVR/ACE/SOLAR-1
1-min RTSW, newest-first, null-tolerant; L1→Earth transit delay already
subtracted for the "Now" marker).

| # | Value | Honest interval language (source-backed) | Source | Uncertainty / caveat |
|---|-------|------------------------------------------|--------|----------------------|
| S1 | Speed | Slow wind ≈ 400 km/s is the common equatorial state; coronal-hole fast streams 500–800 km/s; full observed range <300 to >800 km/s. "High speed winds bring geomagnetic storms while slow speed winds bring calm space weather." Honest bands: <400 typical slow; 400–500 elevated; 500–700 fast (CH-HSS range — "possible storming (G1 or higher)"); 700+ very fast (a G2 alert rode on winds >700 km/s). | SWPC "Solar Wind" phenomena page (`swpc.noaa.gov/phenomena/solar-wind`); SWPC "Coronal Hole High Speed Streams" page; SWPC G2 alert 2026-02-16 (winds >700 km/s); NASA/MSFC solar physics (300 vs 800 km/s streamer/coronal-hole values) | Speed alone never decides: "impacts are highly dependent on speed, density, AND direction of the magnetic field" (same SWPC page). A fast stream with northward IMF can be a non-event. |
| S2 | Density | Typical quiet baseline ≈ 5 p/cm³ (at ~400 km/s). Corotating interaction regions carry "very high densities and strong magnetic fields". Honest bands: single digits typical; tens elevated; 40+ very dense (storm fuel only together with speed + southward IMF). | SWPC Solar Wind page (CIR sentence); MAGNIT/OVATION test baseline 400 km/s + 5 cm⁻³ (PMC9539890, Table 1) | DSCOVR plasma data "can be suspect when densities are low"; very-low-density environments cause erroneous speed/density/temperature (SWPC RTSW + DSCOVR articles). App rows (1–10 low / 10–20 moderate / 40+ high / 60+ very high) are an **in-app convention — no NOAA per-band wording found**. Dynamic pressure needs speed×density, never density alone. |
| S3 | Bt (total IMF) | Total field strength; quiet ≈ a few nT. Higher Bt = more energy available to couple — but only the southward part couples (the Newell coupling function weights Bt by sin⁸/³(θ/2) of the IMF clock angle). Honest bands: <5 quiet; 5–15 elevated; 15–30 strong; 30+ very strong. | Newell et al. 2007/2009 coupling function dΦ/dt = v⁴/³·Bt²/³·sin⁸/³(θ/2) (via NOAA-repo OVATION case study; Machol AGU-2011 poster) | App rows are an **in-app convention — no NOAA per-band wording found**. Big Bt with northward Bz is mostly locked out. Never present Bt as a storm verdict. |
| S4 | Bz (GSM) | The gate. "Most importantly, a southward-directed solar-wind magnetic field" drives storms (SWPC); ALL intense (Dst ≤ −100 nT) storms in the Echer sample occurred with southward IMF. Honest bands: northward (+) gate closed, quiet; 0…−5 weakly coupled, mild; −5…−10 coupled, active possible; <−10 strongly coupled — storm likely **only if sustained for hours**; <−20 severe driving if sustained. | SWPC "Geomagnetic Storms" phenomena page (sustained hours-long wind + southward IMF); Echer et al. 2008 (all Dst ≤ −100 nT storms southward-IMF) | **Duration beats instant value.** SWPC says "sustained (hours-long)"; 1-min RTSW flickers across thresholds constantly. The app's Bz help rows ("−5…−10 active (Kp3-4)", "−10…−20 storm (Kp5-7)", "<−20 major (Kp7+)") map Bz bands to Kp outcomes **with no NOAA source — top NO-GO (§6, N1)**. Coupling functions are probabilistic, not a lookup table. |

L1 honesty shared by S1–S4: DSCOVR at L1 (~1M miles upstream) gives only
**15–60 min lead time** (SWPC DSCOVR article; NASA DSCOVR page); ACE is the
hot backup and SWPC switches sources mid-stream (short data gaps possible);
when L1 input is bad/missing, OVATION falls back to a Kp-driven estimate
**with no forecast lead time** (OVATION product page, History) — that mode must
never be labeled with a lead time.

---

## 2. Sourced fact table — Kp, hemispheric power, Dst (state, still not promises)

| # | Value | Honest interval language (source-backed) | Source | Uncertainty / caveat |
|---|-------|------------------------------------------|--------|----------------------|
| K1 | Live Kp | 0–9 planetary index, 3-hour cadence, mean of 13 observatories (SWPC). Feed rows are tagged observed / estimated / predicted and carry NOAA's own `noaa_scale` (`products/noaa-planetary-k-index.ts` parses all three — verified in code). Kp 5+ = geomagnetic storm. | SWPC Planetary K-index page (ticket-01 F1/F2); live feed shape verified in-repo | **Estimated/predicted values revise.** A 3-hour block is an average, not minute truth; a Kp 5 block contains quiet minutes and vice versa. |
| K2 | Kp→G mapping | Kp 5 = G1, 6 = G2, 7 = G3, 8…9− = G4, 9o = G5; below 5 no storm. Triple-verified: in-app `gScaleForKp` (kp−4, `products/thresholds.ts`); Aurora Dashboard banding "Kp<5 \| 5 (G1) \| 6 (G2) \| 7 (G3) \| 8, 9− (G4) \| 9o (G5)"; live `noaa-scales.json` G-labels (curled 2026-09-12). Dashboard shorthand: Kp 3 quiet / 5 moderate / 7 active / 9 very active aurora. | SWPC Aurora Dashboard (experimental); repo code; live `noaa-scales.json` | Fractional Kp matters at the G4/G5 seam (9− vs 9o). "G1" is *minor storm*, not "big event" — laymen over-read it. |
| K3 | Kp→visibility text | NOAA's own words (Tips on Viewing the Aurora): Kp 0–2 "far north, quite dim…, not very active" · Kp 3–5 "move further from the poles… brighter… more auroral activity (motion and formations). If you are in the right place, these aurora can be quite pleasing" · Kp 6–7 "brighter and active… possible to see… from the northern edge of the United States" · Kp 8–9 "very bright and very active… extended oval observable by the most people… overhead from the northern states". | SWPC "Tips on Viewing the Aurora" (`swpc.noaa.gov/content/tips-viewing-aurora`) — **the primary owner of every Kp→visibility sentence; quote it, don't paraphrase past it** | Same page, verbatim caveat: "the relationship between Kp and auroral latitude [is] approximate and represent[s] averages. There will be times when these relationships do not hold." And: "holds true in **geomagnetic latitude, not geographic**." |
| K4 | Kp→latitude rule | Equatorward edge ≈ 66° − 2° per Kp step, geomagnetic: Kp0→66°, Kp5→~56°, Kp9→48° (Tips page). | Same Tips page | Averages only (K3 caveat). Never convert to a street address. |
| H1 | Hemispheric power | "Estimate of the total auroral energy input at each pole" (OVATION page, Data section). Anchors: ~61 GW ≈ OP-13 high-activity-mode threshold ≈ Kp 5+/6− (Newell et al. 2014 via NOAA-repo case study — **so ~60 GW is the physics-backed G1 neighborhood**, stronger backing than any round number). Long-standing HP legend **[RE-VERIFY against live aurora page]**: <20 GW little/no observable aurora; 20–50 need to be near it; >50 "quite observable with lots of activity and motion"; ≥100 "very significant geomagnetic storm". | SWPC Aurora 30-min page (HPI definition); NOAA-repo Aurorasaurus/OVATION boundary study (Newell 2014, 61 GW); HP legend wording as quoted on SpaceWeatherLive's OVATION page | North HP is what a northern viewer cares about; South HP is shown mirrored in-app — label which is which. App rows (<10 quiet / 15–30 active / 30–50 strong / 50+ very strong) are an **in-app convention** (10–15 GW gap unlabeled); 50+ happens to match the legend's "observable" line. Header of the live product (curled 2026-09-12): "Timestamp is the valid time of a 30 minute forecast", cadence 5 min, `n/a` = missing — say "no data", never zero. |
| H2 | HP/OVATION uncertainty | Auroral-power models explain roughly **half** the variance (best r² ≈ 56–59%, OVATION Prime best instantaneous at r² 56%; AMS 2012 abstract). OP covers 50–90° MLAT and underestimates extreme driving (MAGNIT study). Citizen ground truth: **60% of Aurorasaurus positive reports fell equatorward of SWPC's view-line** — the modeled line is conservative; real sightings run further south. | AMS 92nd Annual Meeting abstract (Newell et al. 2012, Polar UVI validation); PMC9539890 (OVATION caps + underestimates extremes); NOAA-repo case study (60% equatorward stat; visible threshold ~1 erg/cm²/s per Machol 2012; Machol: visible-aurora forecasts correct 86% of the time) | This is the uncertainty budget the interpreter must carry: model ±, view-line conservative, extremes underestimated. "Unlikely / Not in range" is never "impossible". |
| D1 | Dst | Equatorial ring-current index, hourly, nT; negative = storm underway (SWPC geomagnetic-storms page; NCEI/Kyoto definition). Anchors: −50 storm-sample floor (USGS 25-yr Dst statistics); ≤−100 "intense" (Echer 2008); −200 "intense" per Gonzalez et al. 1999 (via Rawat 2010); −195 ≈ Kp 8 "severe" (USGS St Patrick's Day 2015 write-up). App rows (0…−30 quiet-to-unsettled / −50…−100 moderate / −100…−200 strong / <−200 severe) are broadly consistent with these anchors; the −30…−50 seam is unlabeled in-app. | SWPC phenomena page; USGS OFR 2012-1167; Echer et al. 2008; Rawat et al. 2010; USGS 2015 storm page | Dst is hourly and equatorial — it lags substorm onset and says nothing about tonight's oval position. Kyoto feed via SWPC is quick-look/provisional **[RE-VERIFY label at build]**. Dst is a storm *characterizer*, not a viewing forecast — never the interpreter's lead value. |

---

## 3. Kp→G + city list for a "visible as far south as X, Y, Z" line

- **Mapping (verified, §2 K2):** Kp 5→G1, 6→G2, 7→G3, 8→G4, 9→G5 (`gScaleForKp`
  already in `products/thresholds.ts`). Below Kp 5: no G level — say
  "no storm level", never "G0".
- **City wording (NOT verified from sandbox — [RE-VERIFY]):** the NOAA Scales
  Explanation table is recalled to carry per-G aurora lines stepping down the
  US (G1 northern Michigan/Maine → G5 Florida/southern Texas ≈ 40° geomagnetic).
  Do **not** bake any recalled city into copy until read live on
  `spaceweather.gov/noaa-scales-explanation`. The ticket-01 audit (F3) confirms
  only the Kp↔G skeleton, not the city strings.
- **Honest construction (no backend, no geophysics engine):** fixed per-G-level
  southernmost reference taken *verbatim* from NOAA's scale wording + the Tips
  latitude rule (K4) + all of: "may be seen, not will be seen"; "averages, and
  in geomagnetic latitude, not geographic"; darkness + cloud + moon + town-lights
  caveats (§5); and the H2 stat — sightings routinely run equatorward of modeled
  lines, so the city is a *reach* marker, never a boundary promise.
- **Preferred alternative:** skip cities entirely and quote Tips K3 bands
  ("northern edge of the United States" at Kp 6–7, "overhead from the northern
  states" at 8–9) — primary-sourced, no invented geography, no maintenance.

---

## 4. Color, motion, southward extent — what is supportable

- **Color (NOAA Aurora Tutorial, `spaceweather.gov/content/aurora-tutorial`):**
  green 557.7 nm atomic oxygen, 120–400 km — "the most common auroral color";
  deep red oxygen, only above ~300 km (long-lived state, quenched lower down) —
  stormtime/high-altitude; purplish lower border from prompt molecular-nitrogen
  emission (120–200 km, leads the green). NPS aurora-colors article: mid-latitude
  storm aurora is **dominated by red**. Honest lines: green = typical overhead;
  red = high and far — often all a far-south viewer gets; purple fringes ride
  the lower edge when precipitation is energetic. (Altitudes cross-checked:
  NASA SVS infographic; peer-reviewed peak ~114 km for green/blue, Ann. Geophys.
  2023.)
- **Motion:** "more auroral activity (motion and formations)" from Kp 3–5 up
  (Tips K3); "lots of activity and motion" above ~50 GW (HP legend,
  [RE-VERIFY]). OVATION refreshes every 5 min as a 30-min forecast — motion
  *between* frames is real sky, not model output. Never promise "dancing";
  substorm brightenings unfold over minutes and are not in any product we fetch.
- **Southward reach:** K3 bands + K4 rule + OVATION's own "observable from as
  much as 1000 km away when bright and conditions are right" (ticket-01 F11) —
  consistent with keeping the in-app View-distance 600 km cap as the
  *conservative* choice it is (bands + confidence, never single-km fact).

---

## 5. Local-sky inventory — available vs missing (all paths client-side, ADR-0001)

| Data | Status in-app | Detail / gap |
|------|---------------|--------------|
| Cloud (total + low/mid/high) | ✅ Available | Open-Meteo single call: current + 24h hourly strip + 3-day daily, `timezone=auto`, WMO-code lookup, fetched-at stamp, persisted `sw:local-conditions:weather:v1` (`data/weather.ts`; contract pinned by live Kiruna fixture). Manual Refresh only (ADR-0003 exception) — a stale strip looks current except its timestamp. |
| Darkness windows | ✅ Available | On-device `suncalc`: Day / civil / nautical / astronomical / Night (<−18°) bands + polar-day/night copy (`data/sun.ts`, ADR-0005). Offline-safe. |
| Moon phase + illumination % | ✅ Available | Computed from date (Meeus ref), not fetched: phase emoji/name, illumination %, midnight markers on charts (`components/moon/moon.ts`, `moon-chart.tsx`); moon badge "bright Moon washes out faint aurora" (`AuroraNow.tsx:27-47`); moon line on Forecast chart. |
| Moonrise / moonset / moon altitude | ❌ Missing, cheap | `suncalc` exposes `getMoonTimes` + `getMoonPosition`; not wired. Needed before any "moon is up/down tonight" line — phase % alone cannot say whether the moon is above the horizon during the dark window. |
| Display-timezone rules | ✅ Available | Local default / UTC opt-in, one zone ever shown; place-local naive stamps resolved via payload offset (`formatPlaceLocal`); slot grid stays instant-UTC, labels convert; 27-day + daily-indices tables stay UTC with note; far-place times render in device zone, place clock never shown (ADR-0008, `products/display-time.ts`). Interpreter timing lines must obey all of this. |
| View distance | ✅ Available | Band + confidence from stored place to nearest Aurora ≥6 cell ≤600 km; 30–90-min-ahead estimate, not tonight (`products/view-distance.ts`). |
| Freshness / offline honesty | ✅ Available | `As of` + relative age + stale-data notices everywhere; 7-day caches; weather in localStorage (ADR-0003/0006, `offline.tsx`). |
| Light pollution value | ❌ Missing by decision | No Bortle/SQM anywhere: no maintained free CORS point API exists (ticket-01 A11/A17; `aurora-local-conditions-2026-09-01.md` §4 — QueryRaster scraping rejected, VIIRS-tiles+TiTiler needs a backend = the ADR-0001 tripwire). Link-outs to lightpollutionmap.info + cloud-cover map carry lat/lon (`data/external-links.ts`, `ExternalLinks.tsx`). A GIBS VIIRS tile overlay is the visual-only ceiling, still not a number. |
| Place engine | ✅ Available | Nominatim ≤5 matches @1 req/s + optional geolocation, persisted `sw:local-conditions:place:v1`; **code default is Östersund** (`data/place-storage.ts:64-66`) — ADR-0005's "Kiruna" line is stale text, use Östersund in copy. |
| "Tonight" synthesis | ❌ Missing | Nothing combines Kp-night outlook + dark window + cloud + moon into one verdict; ViewDistance (30–90 min) + Forecast min/max-by-day are the nearest parts. This gap is the interpreter ticket's job, bounded by §6. |

---

## 6. NO-GO list — claims the interpreter must never make

- **N1. Bz→Kp lookup.** Never "Bz −12 means Kp 6 tonight". The app's Bz help
  rows (SolarWind.tsx:224-233) map bands to Kp outcomes with no NOAA source;
  coupling is probabilistic and duration-gated (S4). Rewrite or cage with
  "favors / can drive", never "means".
- **N2. Single-driver verdicts.** Never "speed 650 = aurora", "density 40 =
  storm", "Bt 25 = G2". SWPC: impacts depend on speed × density × IMF direction
  together (S1–S3).
- **N3. Town-level guarantees.** Never "aurora over [town] at Kp 6". Use K3
  wording + "may be seen", geomagnetic-not-geographic, likelihood + caveats
  every line (map Q14 standing preference).
- **N4. Color promises.** Never promise green/red/purple for a place/time; never
  green = go / red = bad (oval red = *more intense*, ticket-01 F12). Mid-latitude
  viewers mostly get red (§4) — set that expectation instead.
- **N5. "Tonight" from OVATION.** OVATION answers the next 30–90 min only
  (ticket-01 F10); every oval-derived line carries its lead time. Kp-forecast
  rows are 3-hour planetary averages, not a nightly schedule.
- **N6. Invented sky numbers.** No Bortle/SQM values, no VIIRS→Bortle math (the
  conversion is not a formula; lightpollutionmap.info help page says so, per
  prior research). Link-out only.
- **N7. Moon veto as fact.** "Full moon" ≠ "no aurora". Sourced claim stops at
  "bright Moon washes out faint aurora; darkest skies around new moon are best"
  (AuroraNow popover). Without moon altitude (§5) we cannot even say the moon
  is up.
- **N8. Daylight viewing.** Aurora is not visible in daylight; the sunlit side
  washes it out (OVATION Usage, ticket-01 F11/F12). Any "look now" line is
  gated on the Night band first.
- **N9. Kp↔glow conflation.** "Kp is planetary; Aurora is local" (ADR-0006,
  ticket-01 F9). Never read a bright oval cell as "Kp 8 here", never paint Kp
  colors onto the map.
- **N10. False precision.** No single-km distances (bands + confidence only),
  no "estimated Kp" presented as final (it revises, K1), no lead-time label on
  Kp-fallback OVATION frames (S4/L1 note), no relabeled UTC-dated tables, no
  place-clock times (ADR-0008).
- **N11. Unverified city strings.** No G-scale city baked in until read live on
  the Scales page (§3). Prefer Tips K3 phrasing until then.
- **N12. L1 data as ground truth.** 1-min spikes flicker; low-density DSCOVR
  stretches can be erroneous (S2); source flips (DSCOVR/ACE/SOLAR-1) cause gaps.
  Headline numbers are "latest reading", never "conditions".

## 7. Sources

Primary (official), fetched or excerpted 2026-09-12 unless noted:
1. SWPC "Tips on Viewing the Aurora" — Kp bands, motion/formations, 66−2Kp
   geomagnetic rule, approximate-averages caveat. `swpc.noaa.gov/content/tips-viewing-aurora`
2. SWPC Aurora Dashboard (experimental) — Kp↔G banding incl. 9−/9o seam, Kp
   3/5/7/9 shorthand. `spaceweather.gov/communities/aurora-dashboard-experimental`
3. SWPC Aurora 30-min Forecast page — OVATION inputs (L1 velocity + IMF),
   Kp-fallback mode, HPI definition, Newell 2009 + Machol 2012 refs.
   `spaceweather.gov/products/aurora-30-minute-forecast`
4. SWPC "Solar Wind" phenomena page — 400 slow / 500–800 fast, CIR density +
   fields, speed×density×direction dependence, fast = storms / slow = calm.
   `swpc.noaa.gov/phenomena/solar-wind`
5. SWPC "Geomagnetic Storms" phenomena page — sustained southward-IMF driver,
   Dst ring-current role. `swpc.noaa.gov/phenomena/geomagnetic-storms`
6. SWPC RTSW + DSCOVR articles — L1 15–60 min lead, ACE backup, low-density
   suspect data. `spaceweather.gov/products/real-time-solar-wind`,
   `.../news/real-time-solar-wind-and-noaas-dscovr-satellite`
7. SWPC CH-HSS page + G2 alert 2026-02-16 — HSS G1+ potential; >700 km/s event.
8. NOAA Aurora Tutorial — green 557.7 nm / red >300 km / purple N₂⁺ border physics.
   `spaceweather.gov/content/aurora-tutorial`
9. Live endpoints curled 2026-09-12: `noaa-scales.json` (G-labels),
   `aurora-nowcast-hemi-power.txt` (header: 30-min valid, 5-min cadence, n/a),
   `rtsw_wind_1m.json` + `kyoto-dst.json` (reachability/shape).
10. NCEI Dst indices page + Kyoto WDC (via in-app `SOURCES.kyoto`) — Dst definition.
Peer-reviewed / agency: Newell et al. 2007/2009/2014 (coupling function, OP,
OP-13 61 GW mode); Machol et al. 2012 (86% visible-forecast hit rate, ~1
erg/cm²/s threshold); Echer et al. 2008 (intense ⇔ southward IMF); Rawat et
al. 2010 via Gonzalez et al. 1999 (−200 nT intense); USGS OFR 2012-1167 (−50
floor, −100 median storm); USGS 2015 storm page (−195 ≈ Kp 8 severe); NOAA-repo
Aurorasaurus/OP-13 boundary study (60% equatorward stat, Z-P model); Newell et
al. 2012 AMS abstract (r² ≤ ~59%); Li et al./MAGNIT PMC9539890 (typical
400 km/s + 5 cm⁻³ baseline; OP underestimates extremes); Partamies et al., Ann.
Geophys. 2023 (114 km emission peaks); NASA SVS aurora infographic; NPS aurora
colors (mid-latitude red dominance); CCMC OVATION Prime catalog.
Secondary, quoted only where primary wording is recalled: SpaceWeatherLive
OVATION page (HP legend wording — **[RE-VERIFY]**).
Repo (read at inventory time): `products/solar-wind.ts`,
`products/noaa-planetary-k-index.ts`, `products/thresholds.ts`,
`products/hemi-power.ts`, `products/kyoto-dst.ts`, `products/ovation.ts`,
`products/view-distance.ts`, `products/display-time.ts`,
`products/display-timezone.ts`, `data/weather.ts`, `data/place-storage.ts`,
`data/external-links.ts`, `components/moon/moon.ts`, `moon-chart.tsx`,
`SolarWind/SolarWind.tsx`, `Magnetosphere/Magnetosphere.tsx`,
`AuroraNow/AuroraNow.tsx`, `AuroraNow/OvalGlow.tsx`, `ViewDistanceLine.tsx`,
`CurrentWeatherLine.tsx`, `kp-panel/kp-panel.tsx`, `sources.tsx`,
`conditions/conditions.tsx`, `ExternalLinks.tsx`, ADRs 0001/0003/0005–0008,
`CONTEXT.md`, `docs/research/plain-language-pitfalls-2026-09-12.md`,
`docs/research/aurora-local-conditions-2026-09-01.md`.
