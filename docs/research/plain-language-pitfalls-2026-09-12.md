# Plain-language pitfalls in aurora apps + audit of ours (2026-09-12)

Fact inventory for wayfinder ticket 01 (`plain-language-aurora`). No design, no build.
Question answered: what makes aurora apps hard for laymen/travelers with no
scientific background, and where does OUR app still do that?

Scope audited: Home Dashboard (`/`), Local conditions (`/conditions`), Oval
(`AuroraNow` / `OvalGlow` on Home), Webcams (`/webcams`). Vocabulary per
`CONTEXT.md`; ADRs 0001, 0003, 0005–0008.

---

## 1. Pitfall survey (primary sources)

### P1. Jargon: Kp, Bz, Bt, Dst, hemispheric power, L1

- F1. The Kp index quantifies disturbances in the horizontal component of
  Earth's magnetic field with an integer 0–9 (1 calm, 5+ geomagnetic storm),
  derived from maximum fluctuations on a magnetometer during a 3-hour
  interval. Source: NOAA SWPC, "Planetary K-index" product page
  (`swpc.noaa.gov/products/planetary-k-index`).
- F2. Planetary Kp is the mean standardized K-index from 13 observatories
  between ~44° and 60° northern/southern geomagnetic latitude; "K" from
  German "Kennziffer"; introduced by Bartels (1938); SWPC uses it to decide
  whether geomagnetic alerts/warnings issue. Source: same page.
- F3. The G-scale (G1 minor → G5 extreme) maps onto Kp: storm begins at
  Kp 5 (G1), tops at Kp 9 (G5); below Kp 5 there is no storm (quiet /
  unsettled / active). Source: SWPC Planetary K-index page (Kp<G1/G1…G5
  banding); BGS Kp activity-levels table
  (`geomag.bgs.ac.uk/education/activitylevels.html`) for the quiet/active/
  storm category breaks.
- F4. Dst (disturbance storm time) measures the westward ring current around
  Earth and "has been used historically to characterize the size of a
  geomagnetic storm". The auroral electrojets + ring/field-aligned currents
  together feed the planetary Kp. Source: NOAA SWPC, "Geomagnetic Storms"
  phenomena page (`swpc.noaa.gov/phenomena/geomagnetic-storms`).
- F5. Effective storm drivers are sustained (hours-long) high-speed solar
  wind and, most importantly, a southward-directed solar-wind magnetic field
  (opposite Earth's dayside field). Source: same phenomena page.
- F6. The OVATION model takes solar-wind velocity + IMF measured at L1
  (1.6M km / 1M miles upstream) and computes electron/proton precipitation;
  viewing probability is derived assuming a linear intensity relationship
  (Newell et al. 2009; Machol et al. 2012 validation vs Polar UVI). When L1
  input is contaminated/unavailable, OVATION falls back to a Kp-driven
  estimate with no forecast lead time. Source: NOAA SWPC, "Aurora – 30 Minute
  Forecast" product page (`swpc.noaa.gov/products/aurora-30-minute-forecast`,
  Details + History sections).
- F7. Hemispheric Power Index = estimate of total auroral energy input at
  each pole. Source: same OVATION page, Data section (HPI ASCII link text).
- Implication (inventory, not design): every one of Kp / Bz (GSM) / Bt /
  Dst / hemispheric power / L1 is expert vocabulary a layman must decode
  before any number means anything.

### P2. Number walls (raw values with no verdict)

- F8. NOAA's own aurora page presents the oval as images plus model prose —
  no per-town verdict. Our app inherits this shape: Home shows Kp, four
  solar-wind numbers, hemispheric power GW, Dst nT, Boulder K, Kiruna nT
  traces side by side (see §2). That multi-number dashboard is the "number
  wall" shape this ticket names.
- F9. OVATION grid values are a 0–100 local intensity ("Aurora" per cell),
  NOT Kp: "Kp is planetary; Aurora is local" (`docs/adr/0006`). Conflating
  the two (e.g. reading a bright cell as "Kp 8 here") is the canonical
  misreading. Source: ADR-0006 Why paragraph + OVATION Details section.

### P3. Unclear "tonight" call

- F10. NOAA's OVATION product is a 30–90 minute forecast: "lead time is the
  time it takes for the solar wind to travel from the L1 observation point
  to Earth". It answers "next hour", never "tonight". Source: OVATION page,
  Usage section.
- F11. What IS visible depends on darkness + distance, per NOAA: "Aurora can
  often be observed somewhere on Earth from just after sunset or just before
  sunrise. The aurora is not visible during daylight hours. The aurora does
  not need to be directly overhead but can be observed from as much as
  1000 km away when the aurora is bright and if conditions are right."
  Source: same page, Usage section.
- F12. NOAA's oval colors encode intensity only: "brightness and location of
  the aurora is typically shown as a green oval… The green ovals turn red
  when the aurora is forecasted to be more intense. The sunlit side of Earth
  is indicated by the lighter blue of the ocean and the lighter color of the
  continents." A layman reading green/red as go/no-go or red as "bad" is a
  documented-shape misreading. Source: same page.
- Implication: any app that shows the oval + Kp without answering "can I see
  it tonight from my place, when, where do I look" leaves the traveler's
  core question open.

### P4. Timezone confusion

- F13. All SWPC data is UTC-native: the 3-day text product breakdown is
  labeled `00-03UT … 21-00UT` (`services.swpc.noaa.gov/text/3-day-forecast.txt`,
  live 2026-09-07 sample: "greatest expected 3 hr Kp … 4.67 (NOAA Scale
  G1)").
- F14. Our app renders every absolute timestamp in a chaser-chosen Display
  timezone — Local (device zone, default) or UTC, one zone ever shown —
  EXCEPT the two UTC-dated tables (27-day outlook, daily geomagnetic
  indices) whose rows aggregate NOAA UTC days and keep UTC date cells with a
  visible note. Local-conditions times render in the device zone even when
  the geocoded place is in another timezone; "the place's clock is never
  displayed". Source: `docs/adr/0008` + `CONTEXT.md` (Display timezone,
  UTC-dated table, Place-local time).
- Implication: a traveler comparing our times against a hotel clock in
  another zone, or against NOAA's native UT slots, can misread by hours.

### P5. Map legibility (color-only, low contrast, no text alternative)

- F15. WCAG 2.1 AA requires text ≥ 4.5:1 (3:1 large) — SC 1.4.3; UI
  components + graphical objects required to understand content ≥ 3:1
  against adjacent colors — SC 1.4.11; information conveyed by color must
  also be available in text — technique G14; adjoining-color boundaries need
  3:1 or a separating border — technique G209; every non-text content needs
  a text alternative — SC 1.1.1. Sources: W3C `TR/WCAG21`, Understanding
  1.4.11 (`WAI/WCAG21/Understanding/non-text-contrast`), technique G209,
  MDN "Color contrast".
- F16. Heatmaps/maps whose colors ARE the data are a known hard case
  (exempt only where a particular presentation is essential; adjoining
  segments still need boundaries or text). A green→red glow that a
  deuteranope reads as one brown wash, or faint glow on a near-black ocean,
  is the concrete failure shape. Sources: same WCAG set (1.4.11 intent,
  G209 map-with-borders example).
- F17. Our oval basemap fill `#444444` on `rgb(1,3,11)` measures 2.16:1 —
  recorded in `docs/adr/0007` as a deliberate exception, NOT a WCAG
  non-text-contrast claim (the "3.66:1" first recorded was a miscalculation).

### P6. Alert overload / alert-vs-watch-vs-warning confusion

- F18. SWPC uses three distinct products: K-index Watches (highest predicted
  daily Kp = 5/6/7/≥8, reported in G-scale terms), Warnings (Kp 4/5/6/7+
  expected), Alerts (Kp 4/5/6/7/8/9 reached). Source: SWPC Planetary K-index
  page (Usage/Details).
- F19. Our app has no push/backend by architecture: "No user accounts;
  alerting beyond what the browser can do locally is out of scope"
  (`docs/adr/0001`); polling is TanStack `refetchInterval` on real-time JSON
  only — Kp/Scales/alerts/Dst 5 min, solar-wind summary 60 s — paused when
  the tab is hidden (`docs/adr/0003`); alerts fire only "while this tab is
  open" (`Alerts.tsx` footnote).
- Implication: a layman expecting phone-push aurora alerts, or reading one
  "Alerts" strip as covering watches + warnings + alerts, will be surprised.

---

## 2. Audit of OUR surfaces against the same list

### Home Dashboard — route `/` (`src/components/pages/home/Home.tsx`)

Panels: `AuroraNow` (Kp + oval + view distance), `Forecast` (Kp chart +
3-day table + ENLIL video), `SolarWind`, `Magnetosphere`, `PinnedWebcams`,
alerts modal behind the header Alerts button (`ALERTS_ENABLED` flag).

- A1 (jargon, still expert-assumed). Panel headings are bare nouns:
  "Aurora now", "Solar wind", "Magnetosphere", "Forecast"
  (`AuroraNow.tsx`, `SolarWind.tsx`, `Magnetosphere.tsx`, `Forecast.tsx`).
  Headline numbers carry unit-only notes: `km/s`, `p/cm³`, `nT`, `GW`
  (`SolarWind.tsx` SparklineCards; `Magnetosphere.tsx` hemi/Dst cards).
  Full terms appear only inside `(i)` HelpPopovers: "Interplanetary magnetic
  field (IMF), Bz (GSM) component…", "Disturbance Storm Time index…",
  "Hemispheric power…" (`SolarWind.tsx:194-253`, `Magnetosphere.tsx:224-299`).
  A layman who never opens `(i)` meets Speed / Particle density / Bt / Bz /
  Hemispheric power / Dst with no in-flow gloss.
- A2 (number wall). One screen shows: current Kp badge + `KpBar`
  (`AuroraNow.tsx:176-184`); Speed, Density, Bt, Bz sparklines each with
  threshold-row tables (`SolarWind.tsx:141-253`); North/South GW mirrored
  chart + Dst + Kiruna X/Y/Z magnetogram + Boulder K
  (`Magnetosphere.tsx:199-301`); observed-vs-forecast Kp chart + 3-day
  min/max table + ENLIL video caption (`Forecast.tsx:217-434`). No panel
  gives a tonight verdict; synthesis is left to the reader.
- A3 (tonight call missing). Closest to a verdict is the `ViewDistanceLine`
  band (`Aurora {band} – {place}`, bands Overhead/Nearby/Likely/Possible/
  Unlikely/Not in range, `products/view-distance.ts` via
  `VIEW_DISTANCE_BANDS`) plus the `CurrentWeatherLine` one-liner
  ("{temp}, {wmo text}, {%} clouds. Local conditions →",
  `CurrentWeatherLine.tsx`) — a 30–90-min-ahead estimate, not tonight.
  The Forecast panel's min/max table groups planetary JSON by
  display-timezone day (`Forecast.tsx:155-186`) but shows Min/Max Kp + G
  label only, no "best night" or "when to look" row.
- A4 (timezone). Current-Kp slot label, freshness lines (`As of`/`Updated X
  ago`), Forecast chart ticks/tooltip, oval `Forecast Time` all follow the
  Display timezone (`useDisplayTimezone` in `AuroraNow.tsx`,
  `Forecast.tsx`, `OvalGlow.tsx`); slot grid stays instant-based UTC
  underneath (`AuroraNow.tsx:163-166`). Correct per ADR-0008, but a traveler
  comparing with NOAA UT slots must know the mode — only the Time modal
  (`TimeModal.tsx`) + UTC suffixes explain it.
- A5 (alerts). `Alerts.tsx`: threshold slider Kp 1–9 (default 5 = G1,
  `gLabelForThreshold`), single newest-match strip, "No alerts at Kp
  {threshold} or higher right now" empty state, "Alerts while this tab is
  open" footnote, opt-in browser alerts. Watch vs warning vs alert
  vocabulary is collapsed into one strip; threshold semantics (Kp 5 = minor
  storm) live in the slider's `aria-valuetext`, not in visible text.

### Oval — `AuroraNow` → `OvalGlow` (`.../AuroraNow/OvalGlow.tsx`)

- A6 (map legibility, mitigated but still expert). One pole-to-pole canvas
  (`360×181`, `ovalCellPoint`), continuous ramp `OVAL_RAMP_STOPS`
  (transparent→green carries ordinary 1–30, yellow 45, orange 60, red 75,
  magenta 100; `OvalGlow.tsx:89-99`), legend bar gradient + "you are here"
  max tick derived from the same stops (`ovalLegendGradientCss`,
  `ovalLegendMarkerPos`; tick `aria-hidden`, table stays the data
  alternative). Glow levels are deliberately numberless words
  (Faint/Moderate/Strong/Intense, `OVAL_LEVELS`) because "the same core
  brightness occurs at any Kp" (`OvalGlow.tsx:40-56`); numeric ranges were
  dropped 2026-09-04 (ADR-0006 note). Text alternatives exist: canvas
  `role="img"` + `aria-label` (`ovalCanvasLabel`), closed-by-default "Glow
  intensity table" disclosure with per-hemisphere cell counts, "About this
  map" popover (cloud/moon/light-pollution caveat; "local brightness per
  1-degree cell – not the Kp storm scale"; diffuse-glow note)
  (`OvalGlow.tsx:693-744`). Color-blind toggle repaints through viridis
  (`OVAL_VIRIDIS_RAMP_STOPS`, `sw:oval:cb:v1`).
- A7 (residual gaps). (a) The legend bar + max tick are decoration; exact
  value at the tick is `title`-only ("Current maximum"). (b) The
  numberless-table choice means a layman cannot map green→red onto Kp/G —
  by design, but the Kp↔glow confusion (F9) is addressed only inside the
  popover sentence. (c) Basemap contrast exception stands (F17). (d) The
  `VIEW_DISTANCE_COPY` explainer ("Each colored square is a 30-min forecast
  (1°)… Nearest square ≥6 is the band… Forecast Time 30-90 min ahead",
  `ViewDistanceLine.tsx:26-29`) lives behind the `(i)`; the visible line
  itself ("Aurora {confidence} {place}") assumes the band vocabulary.
- A8 (freshness honesty, good). Oval shows `Forecast Time {ft} – 30–90 min
  lead` (`OvalGlow.tsx:705-708`); `As of`/`Updated {age}` + `StaleDataNotice`
  follow the offline discipline (ADR-0003/0006). Boundary artifact rows
  (lat 0/−1/90/−90) are clipped from paint AND counts (`isBoundaryRow`,
  ADR-0007) — invisible to users, noted here so the interpreter does not
  re-explain them.

### Local conditions — route `/conditions` (`.../conditions/conditions.tsx`)

- A9 (structure). `DayBlock` ("Today's daylight chart" + `LuminosityTimeline`
  bands Day / civil / nautical / astronomical / Night <−18°;
  `DayBlock.tsx`, `LuminosityTimeline.tsx`) + `WeatherBlock` (Open-Meteo
  current + 24h hourly strip + 3-day daily; temp/humidity/cloud + low/mid/
  high split + WMO code lookup; `WeatherBlock.tsx`, `WeatherCurrent/
  Hourly/Daily.tsx`) + `ExternalLinks` (light-pollution + radar link-outs).
- A10 (jargon). Band names (civil/nautical/astronomical twilight, Night)
  follow CONTEXT qualifiers but are unexplained in-flow; polar copy is two
  short strings ("Sun does not set/rise today", `DayBlock.tsx:6-9`).
  Weather shows WMO-code text via closed local lookup (unknown → "Unknown").
  "Updated at HH:MM, near {shortName}" + "Source: Open-Meteo" is the only
  provenance line (`WeatherBlock.tsx:81-97`).
- A11 (traveler gaps). (a) Place-clock gap: times render in the device zone
  even for a far-away place (ADR-0008) — a traveler checking tonight in
  Tromsø from a US device sees device-zone times. (b) No darkness verdict:
  the timeline shows bands but never "dark from X to Y". (c) No tonight
  synthesis: cloud strip + daylight chart + oval live on different routes
  (`/` vs `/conditions`); only `CurrentWeatherLine` links them. (d) Light
  pollution has no value by decision — link-out only, no Bortle number
  (ADR-0005) — so "town lights" stays a caveat, never a measurement.
  (e) Weather is manual-Refresh-only, no polling, no refetch on focus
  (ADR-0003 exception, ADR-0005; `WeatherBlock.tsx:41-45`) — a stale strip
  looks current except for the fetched-at timestamp.
- A12 (default-place fact). `CONTEXT.md` says the empty store defaults to
  Östersund, Sweden; ADR-0005's consequence line still says Kiruna. Both
  cited — implementation reads from `useGeocodedPlace`; interpreter copy
  must use whichever the code default is at build time.

### Webcams — route `/webcams` (`.../webcams/webcams.tsx`)

- A13 (three-tab mental model). Views "Relevant now" (curated, dark-gated
  per station via `isSunBelowHorizon`, sunset→sunrise; ignores filter/hidden)
  / "My selection" (filter + hidden apply) / "All cameras" (nothing
  filtered/hidden) — `VIEW_DESCRIPTIONS` (`webcams.tsx:150-156`). A layman
  meeting an empty curated grid in daylight, or a missing cam that is only
  hidden/filtered, must grasp the tab contract from one description line.
- A14 (still-vs-live confusion). Gallery is operator-cadence stills; only
  the UAF Poker Flat entry follows a CORS-open SSE feed (~5–15 s frames,
  `Live cam` + per-card `Live updates` opt-in gated on global auto-refresh
  + tab visible, CONTEXT) plus the Lights-over-Lapland Twitch embed; the
  rest are `Webcam` image cards vs `Webcam link` rows (YouTube/Twitch/site
  player/HTTP-only, `KIND_NOTES`). Card freshness is honest by construction:
  "Loaded HH:MM. Refreshes every N min." in the Display timezone — browser
  load time, never operator capture time (CORS), per the `Loaded stamp`
  contract; auto-refresh spans 2–10 min (`autoRefreshLabel`).
- A15 (controls load). Toolbar packs Refresh, region Filter, Hidden sources,
  1–2-pin dashboard mode (`PinnedWebcams.tsx` on Home), auto-refresh
  checkbox; regions collapse per persisted `closedPanels`; jump-to links per
  region; "Looking for more? EarthCam world map" note. Powerful, but every
  control assumes the viewer already knows what a sky-cam still can and
  cannot prove (cloud directly overhead vs aurora 300 km away).

### Cross-cutting (all surfaces)

- A16 (help-behind-`(i)` pattern). The app's main plain-language layer today
  is `HelpPopover` rows+text per card (solar-wind threshold rows, Dst rows,
  hemi rows, Boulder rows, Kiruna prose, oval paragraphs, view-distance
  band table). Accurate and sourced, but opt-in: nothing on the surface
  answers "can I see aurora tonight from my place, when and where do I
  look" without opening popovers and synthesizing across routes.
- A17 (honest-by-construction inventory, for the interpreter ticket).
  Caveats already in copy: cloud/moon/town-lights (oval + view-distance
  popovers); moon badge emoji + "bright Moon washes out faint aurora… darkest
  skies around new moon" (`AuroraNow.tsx:27-47`); moon-illumination line on
  the Forecast chart (`MoonLine`/`MoonYAxis`); daylight/twilight engine is
  on-device `suncalc` (ADR-0005, offline-safe); place engine is Nominatim
  ≤5 matches @1 req/s + optional browser geolocation, persisted
  `sw:local-conditions:place:v1`; weather is Open-Meteo `timezone=auto`
  with fetched-at stamp + persisted `sw:local-conditions:weather:v1` for
  offline; no light-pollution value exists anywhere (link-out only).
- A18 (alert/threshold default). Alert threshold Kp 1–9 default 5
  (`CONTEXT.md`: Alert threshold; `Alerts.tsx` slider) — G1 == Kp 5 is the
  only scale anchor a layman gets, inside the slider output.

---

## 3. Pitfall → our-surface matrix (where we still assume expertise)

| # | Pitfall | Our surface | File / route | Status |
|---|---------|-------------|--------------|--------|
| 1 | Jargon headlines (Kp/Bz/Bt/Dst/GW/nT) | SolarWind, Magnetosphere cards | `home/components/SolarWind/SolarWind.tsx`, `home/components/Magnetosphere/Magnetosphere.tsx`, route `/` | Assumes expertise; gloss only in `(i)` |
| 2 | Number wall, no verdict | Whole Dashboard | `home/Home.tsx`, route `/` | Assumes synthesis |
| 3 | No tonight call | ViewDistance band (30–90 min) + Forecast min/max | `AuroraNow/ViewDistanceLine.tsx`, `Forecast/Forecast.tsx` | Nearest answer is not tonight |
| 4 | Timezone vs place clock | All timestamps; conditions page | `DisplayTimezone/*`, `navigation/TimeModal.tsx`, `/conditions` | Device-zone rendering; place clock never shown (ADR-0008) |
| 5 | Color-only map | Oval glow + legend | `AuroraNow/OvalGlow.tsx` | Mitigated (table, aria-label, viridis) but legend tick title-only; basemap 2.16:1 exception |
| 6 | Alert overload / watch-vs-warning | Alerts strip + threshold | `home/components/Alerts/Alerts.tsx` | Collapsed to one strip; tab-open-only (ADR-0001) |
| 7 | Still vs live cams | Webcams gallery | `pages/webcams/webcams.tsx`, `/webcams` | Only Poker Flat live + Twitch; rest stills/link rows |
| 8 | Cloud/moon/light-pollution synthesis | Split across `/` + `/conditions` | `CurrentWeatherLine.tsx`, `WeatherBlock.tsx`, `ExternalLinks` | Caveats exist; no combined go/no-go |
| 9 | Kp↔glow conflation | Oval popover sentence only | `OvalGlow.tsx:697-701` | One sentence carries it |

---

## 4. Sources

Primary (fetched live 2026-09-11/12):

1. NOAA SWPC, "Aurora – 30 Minute Forecast" product page — OVATION 30–90
   min lead, L1 input, green→red intensity, daylight invisibility, 1000 km
   visibility, HPI/grid data links. `https://www.swpc.noaa.gov/products/aurora-30-minute-forecast`
2. NOAA SWPC, "Planetary K-index" product page — Kp 0–9 3-hour definition,
   13 observatories, G-banding, watch/warning/alert thresholds.
   `https://www.swpc.noaa.gov/products/planetary-k-index`
3. NOAA SWPC, "Geomagnetic Storms" phenomena page — storm drivers
   (sustained high-speed wind + southward IMF), Dst ring-current role, Kp
   generation. `https://www.swpc.noaa.gov/phenomena/geomagnetic-storms`
4. NOAA SWPC, 3-day forecast text product (live sample 2026-09-07) —
   UT-slot format + G1@Kp evidence.
   `https://services.swpc.noaa.gov/text/3-day-forecast.txt`
5. W3C, WCAG 2.1 (`https://www.w3.org/TR/WCAG21`) — SC 1.4.3, 1.1.1.
6. W3C, Understanding SC 1.4.11 Non-text Contrast
   (`https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html`) —
   3:1 UI/graphical-object rule.
7. W3C, Technique G209 adjoining-color boundaries
   (`https://www.w3.org/WAI/WCAG21/Techniques/general/G209`).
8. MDN, "Color contrast" (WCAG ratio table + checker guidance).
9. BGS Geomagnetism, Kp activity levels table (quiet/active/storm + NOAA
   G mapping). `https://geomag.bgs.ac.uk/education/activitylevels.html`

Repo (read at audit time):

10. `CONTEXT.md` — glossary: Kp index, Planetary K-index (live), Bz (GSM),
    Hemispheric power, Dst, Alert threshold, Oval, View distance, Night /
    twilights, Local conditions, Geocoded place, Display timezone,
    UTC-dated table, Webcam / Camera station / Webcam link / Live cam /
    Loaded stamp, Weather refresh.
11. `docs/adr/0001` (client-side-only, no push), `0003` (live polling
    cadences + hidden-tab pause), `0005` (suncalc, manual weather refresh,
    light-pollution link-out, Nominatim discipline), `0006` (offline PWA,
    personal oval, band+confidence, Kp-vs-Aurora distinction), `0007`
    (one-world canvas, continuous ramp anchors, viridis, 2.16:1 basemap
    exception, boundary-row clipping), `0008` (Local-default display
    timezone, place-clock rule).
12. `src/components/pages/home/Home.tsx` (Dashboard shell, `ALERTS_ENABLED`).
13. `src/components/pages/home/components/AuroraNow/AuroraNow.tsx`
    (Kp badge/curtain/bar, moon badge, freshness).
14. `.../AuroraNow/OvalGlow.tsx` (`OVAL_RAMP_STOPS`,
    `OVAL_VIRIDIS_RAMP_STOPS`, `OVAL_LEVELS`, legend/table/popover/toggle).
15. `.../AuroraNow/ViewDistanceLine.tsx` (`VIEW_DISTANCE_COPY`, band line,
    `PlaceFinder` trigger) + `CurrentWeatherLine.tsx` (weather one-liner).
16. `.../Forecast/Forecast.tsx` (Kp observed/forecast chart + moon line,
    3-day min/max by display day, ENLIL video).
17. `.../SolarWind/SolarWind.tsx` (Speed/Density/Bt/Bz cards + L1 transit
    note) + `.../Magnetosphere/Magnetosphere.tsx` (hemi/Dst/Kiruna/Boulder).
18. `.../Alerts/Alerts.tsx` + `AlertsDialog.tsx` (threshold slider, strip,
    tab-open-only footnote).
19. `src/components/pages/conditions/conditions.tsx` + `DayBlock/DayBlock.tsx`
    + `LuminosityTimeline/*` + `Weather/WeatherBlock.tsx` (+
    `WeatherCurrent/Hourly/Daily.tsx`) + `ExternalLinks/*` (route
    `/conditions`).
20. `src/components/pages/webcams/webcams.tsx` (+ `WebcamImageCard`,
    `WebcamLiveCard`, `WebcamTwitchCard`, `webcam-card-parts.tsx`,
    `data/webcams.ts`, `data/webcam-storage.ts`) + `PinnedWebcams/*`
    (route `/webcams`).
21. `src/components/navigation/TimeModal.tsx` +
    `src/components/DisplayTimezone/DisplayTimezoneContext.tsx`.

Handoff note for the interpreter-content ticket: rows F1–F19 are the
citeable facts; A1–A18 are the audit claims (each pinned to a file above).
The open discrepancy in A12 (Östersund vs Kiruna default) should be resolved
by reading `useGeocodedPlace` before any copy names a default town.
