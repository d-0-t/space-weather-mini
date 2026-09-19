# Space Weather Display

A client-side web app that presents NOAA SWPC space weather products — forecasts, indices, and alerts — as an accessible, explainable display.

## Language

### Products

**Space weather product**:
A data source published by NOAA SWPC that the app fetches and displays: the forecast discussion, 3-day forecast, weekly report, 27-day outlook, daily geomagnetic indices, or geophysical alert.
_Avoid_: feed, data file, text file

**Forecast discussion**:
NOAA's narrative forecast for the next 1–3 days, in four sections: Solar Activity, Energetic Particle, Solar Wind, and Geospace.
_Avoid_: discussion.txt

**3-day forecast**:
NOAA's structured forecast of geomagnetic activity, solar radiation storms, and radio blackouts over the next three days; each section has a probability table and a rationale.
_Avoid_: 3day, three day report

**Weekly report**:
NOAA's weekly narrative summary, with Highlights and Forecast sections.
_Avoid_: weekly.txt

**27-day outlook**:
NOAA's tabular outlook of radio flux, planetary A index, and largest Kp index for the next 27 days.
_Avoid_: 27days, 27-day forecast

**Daily geomagnetic indices**:
NOAA's table of observed Kp and A indices for the last 30 days, per station (Fredericksburg middle-latitude, College high-latitude, estimated planetary).
_Avoid_: DGD, daily indices

**Geophysical alert**:
NOAA's alert message covering solar X-ray, energetic-particle, and geomagnetic conditions, with observations and predictions.
_Avoid_: GeoAlert, wwv (internal names only)

**Alerts (alerts/watches/warnings feed)**:
NOAA's JSON feed of current alerts, watches, and warnings (`alerts.json`), each item carrying a product code — `WARK05` (Kp 5 warning), `ALTK04` (Kp 4 alert), `WATA30` (A-index 30 watch) — and a message text. Distinct from the geophysical alert text product; the alert threshold drives which items surface.
_Avoid_: alert feed, warning feed, alerts (without feed)

**Daily outlook alert**:
One background push per place-local day, inside the morning–lunch send window (06:00–12:00 in the stored place's own timezone), naming tonight's expected Kp and the darkest window at the stored geocoded place (e.g. "Tonight Kp 5.33 expected. Darkest at Luleå 22:01–02:50."). Threshold-gated like the Kp alert: it pokes only when the next-24h Kp forecast breaches the chaser's own Alert threshold, so quiet days and midnight-sun days (no dark stretch to plan) stay silent. Describes the coming night, never the one just past; deduped once per place-local day by the `daily-outlook|{date}` key, with the daily kind's ~12h time-to-live carrying the newest outlook to a phone that reconnects after the send. Speaks in Kp numbers, never in verdict words.
_Avoid_: daily notification (without outlook qualifier)

**Kp alert**:
A background push when the official 3-hour Kp value or the Kp forecast breaches the chaser's alert threshold, honestly labeled observed vs predicted, re-poking on escalation only. An escalation is a step up the integer Kp scale (5.33 to 6.33 re-pokes; 5.33 to 5.67 does not). Events are deduped by the product|slot|Kp-step keys the sender stores per chaser, so a storm carrying across 3-hour slots at one level stays silent. Speaks in Kp numbers, never in verdict words.
_Avoid_: kp notification (as the alert's name)

**Live alert**:
A background push from the Summary's shared verdict word at the stored geocoded place, gated by the chaser's hindrance gates (cloud, precipitation, darkness). A distinct alert type from the Kp alert; speaks in verdict words, never in Kp numbers. The word is graded through the app's own functions — one seam, never forked, so Summary improvements automatically improve alerts: `overallWord` over the newest observed Kp and the L1 word from the same readings the Summary's default "Now" option displays, on the same 5-minute-average rule. Both drivers must be present: a missing observed Kp or L1 reading leaves the word uncomputed and the leg silent (never a guessed word). The favorable pivot is "moderate", the five-word ladder's midpoint — below it the glow "may stay far north and faint", at it aurora is "possible now, brighter and moving". The trigger pokes once on the favorable turn, re-pokes when the word escalates a rung, stays silent when it eases back, marks the next slot's carry of the same word silently, and re-pokes after skipped slots (a dipped word or a feed gap) — the Kp alert's escalation rules on its own key family `live|{canonical UTC slot}|{word}`. Hindrance-gated moments record nothing, so a sky that clears later in the same word still pokes once; the live kind's ~1h time-to-live means stale pokes die quietly and a reconnecting phone receives the newest only. Weather for the gates is the same Open-Meteo contract the Local conditions weather card maps, fetched per live-enabled chaser at their own stored place — only when the word is favorable.
_Avoid_: live notification (when the alert is meant), summary alert

**Hindrance gate**:
One of the Live alert's three per-hindrance conditions at the stored geocoded place, controlled inside the alert settings modal's "Live alert settings at {shortName}" group: cloud cover below the chaser's own percentage (a slider alone, no toggle — 100% by default, so only a fully overcast sky withholds), precipitation (the positive checkbox "Show aurora alerts when it's raining or snowing", on by default, so rain and snow never withhold until it is unticked), and darkness at or darker than the chosen band — Night, Astronomical Twilight, Nautical Twilight, or Any including daytime (Twilight always spelled out; Any by default, never blocking). The defaults are permissive (2026-09-19 review): the Live alert is word-driven until the chaser tightens a gate. Cloud and precipitation ride the same Open-Meteo contract the Local conditions weather card maps; darkness judges the instant's solar elevation from the same solar model the darkest-window computation cuts its windows from (Night ≤ −18°, Astronomical Twilight ≤ −12°, Nautical Twilight ≤ −6°, Any at every elevation). An unknown reading withholds — an unknown sky never guesses.
_Avoid_: gate (alone, when the hindrance gate is meant), weather filter

**Push sender**:
The tiny backend beside the SPA (ticket 02 of the background-alerts effort): a scheduled function that polls the same NOAA products the app already reads, evaluates every stored push subscription against the chaser's own alert settings, and fans out Web Push over Netlify's built-in key-value store behind the 3-method seam (save / load-all / remove). No accounts: the push subscription endpoint is the identity, and every settings change overwrites blindly.
_Avoid_: backend (when the sender is meant), server, pusher

**Poke**:
One Web Push message the push sender fans out for an alert event, VAPID-signed with the app-server key and shown as a visible notification inside the service worker's wait-until chain (silent pushes risk platform revocation, so every push ends visible). Repeats of the same event collapse by their dedupe key rather than stack. A test poke is the manual canned poke the maintainer fires end to end on a real installed phone.
_Avoid_: notification (when the poke is meant), silent push (this app never sends one)

### Phenomena

**Geospace**:
The near-Earth space environment — magnetosphere, ionosphere, radiation belts. Also the fourth section of the forecast discussion.
_Avoid_: geospace as a synonym for geomagnetic activity

**Geomagnetic activity**:
Disturbance of Earth's magnetic field, measured by the Kp and A indices. The first section of the 3-day forecast.
_Avoid_: geomagnetism; geospace when geomagnetic is meant

**Aurora forecast**:
The OVATION 30-minute aurora images for the north and south polar regions.
_Avoid_: aurora images, aurora map

**Solar wind**:
The stream of charged particles from the Sun, measured by speed, density, and the interplanetary magnetic field.
_Avoid_: solar storm (when the ambient wind is meant)

**Interplanetary magnetic field (IMF)**:
The Sun's magnetic field carried by the solar wind; its magnitude is Bt and its north-south component is Bz.
_Avoid_: magnetic field (without IMF/Bt/Bz qualifier)

**Bz (GSM)**:
The north-south component of the interplanetary magnetic field in GSM coordinates; southward (negative) Bz enables reconnection and aurora.
_Avoid_: Bz without GSM, southward Bz as a synonym for storm

**Hemispheric power**:
Total auroral particle power over a hemisphere in gigawatts, estimated from OVATION.
_Avoid_: aurora power, HPI without GW unit

### Measures

**Kp index**:
The planetary geomagnetic activity index on a 0–9 scale (0 quiet, 9 extreme storm). The `kp01`–`kp9` CSS classes are its presentation, not its name.
_Avoid_: K-index, Kp value

**Planetary K-index (live)**:
The JSON feed of observed and forecast Kp values (`noaa-planetary-k-index` and `noaa-planetary-k-index-forecast`), distinct from the archival 30-day table.
_Avoid_: Kp forecast (without live/archival qualifier)

**A index**:
The daily planetary geomagnetic index derived from Kp.
_Avoid_: Ap index (when the daily planetary A index is meant)

**Dst index**:
The hourly disturbance storm time index of equatorial magnetic disturbance; negative values indicate ring-current enhancement.
_Avoid_: Dst value, storm index (without Dst)

**Alert threshold**:
The chaser-set Kp value (1–9, default 5) that the alerts banner and opt-in browser notifications trigger on; G1 maps to Kp 5. The alert settings modal explains the 0–9 scale and its G1–G5 mapping in a one-line popover beside the slider, and tips the Kp that typically brings the oval to the stored place (the smallest Kp whose Tips reach edge reaches the place's approximate geomagnetic latitude, never a promise).
_Avoid_: alert level, trigger (without Kp)

**Alerts modal**:
The Dashboard header's native dialog for the alert settings, opened by the header's Alerts button and mounted only while open; named by its visible Alerts heading (aria-labelledby, the Time modal pattern). Holds the Kp alert threshold slider with its Kp-scale explainer popover and place tip, the three background alert types (Daily outlook alert, Kp alert, Live alert) as independent checkboxes, the Live alert's hindrance settings at the stored place (its named group carries the cloud-percentage slider, the show-when-raining-or-snowing checkbox and the darkness-band select), the browser-alerts permission flow (Enable always attempts; a granted permission that still cannot subscribe or store gets an honest panel with Try again and the install pointer), the background-alerts controls when the browser holds a subscription (test poke, disable), and the install hint shown to mobile visitors. Apply persists the threshold, the type toggles and the gates as one change (one store, one sender overwrite); Cancel, X, Escape and the backdrop discard the drafts; a closed dialog returns focus to the trigger. The type toggles gate only the sender's background pokes; the in-app strip and local notifications keep running regardless.
_Avoid_: alerts settings (as the modal's name), notifications modal

**Radio flux**:
Solar radio flux at 10.7 cm wavelength, a solar activity proxy.
_Avoid_: solar flux, SFU

### Storm scales

**NOAA scale**:
The unified G/R/S scale system for geomagnetic, solar radiation, and radio blackout storms.

**Geomagnetic storm**:
A G1–G5 scale event of geomagnetic disturbance, keyed to the Kp index (G1 at Kp 5 through G5 at Kp 9).

**Solar radiation storm**:
An S1–S5 scale event of elevated energetic particles.

**Radio blackout**:
An R1–R5 scale event of X-ray flares disrupting HF radio.

### Sections

**Day summary**:
The 24-hour activity summary at the start of each forecast discussion section.
_Avoid_: 24 hr summary, daySummary (internal names only)

**Rationale**:
The concluding prose of each 3-day forecast section, explaining the forecast in the forecaster's words.
_Avoid_: regional text, regionale (the product carries no per-region prose)

### Time

**Display timezone**:
The timezone every absolute timestamp renders in, chosen by the chaser between Local (the device zone, the default) and UTC. Two-state, no "show both" mode: only one zone is ever shown, and relative ages carry no zone. Governs all shown timestamps, including place-local ones — except the UTC-dated tables. Governs day grouping too: "today" is the display timezone's calendar day, and a day-boundary-straddling slot belongs to the day its start falls in.
_Avoid_: timezone setting, UTC mode (as the setting's name), local time (without qualifier)

**UTC-dated table**:
A table whose rows are aggregates of NOAA's UTC calendar days — the 27-day outlook and the daily geomagnetic indices — so its date cells stay in UTC in both modes, with a visible note when the display timezone is Local.
_Avoid_: UTC table, aggregate table

**Time modal**:
The Display timezone control (ticket 02 of the display-timezone effort), a native `<dialog>` opened by the nav's gear-icon Time button — styled like the Astro mode button and placed before it, reachable from the hamburger panel; the button's visible label carries the current setting, "Time (local)" or "Time (UTC)", at every width and with no tooltip. A "Show times in UTC" checkbox plus Apply (saves and closes) and Cancel, X, Escape and backdrop (all dismiss without saving), focus returning to the trigger; named by its visible heading like the alerts modal. The modal explains the device-timezone rule — times follow the device's timezone no matter which place is picked — and the UTC-dated-table exception.
_Avoid_: time settings, timezone dialog (internal names only)

**Place-local time**:
Time in the IANA zone of the geocoded place — the native frame of Open-Meteo timestamps, which carry no offset. Distinct from device-local time and from the display timezone; rendered in the display timezone like every other timestamp.
_Avoid_: local time (without qualifier), place time

### Navigation

**About submenu**:
The header's About disclosure (ticket 01 of the display-timezone effort), a native `<details>/<summary>` disclosure sharing the Details submenu's shape and keyboard behavior: a trigger summary opening an sr-only-labelled list of This site (the biography and future-plans article at `/about`), Sources (the Data & Sources article at `/about/sources`), Explainers (`/explainers`) and Aurora guide (`/about/guide`). Explainers appears only inside this submenu, never at the top level.
_Avoid_: about page (when the submenu is meant), sources link (without the subpage name)

### Presentation

**UI palette**:
The eight-color system for all non-data UI derived from the aurora bird: White, Black, Deep Indigo, Primary Dark Violet, Lighter Purple Highlights, Dark Green Shadows/Bases, Medium Green Midtones, and Light Lime Highlights. Plus the status accents gold, orange, and status red (active-filter / hidden-source indicators, ticket 05).
_Avoid_: theme colors, brand palette

**Color token**:
A named alias for a raw palette color or its semantic role (background, surface, accent, border) used throughout the UI.
_Avoid_: CSS variable, SCSS variable, hex code

**Surface**:
A violet/indigo container background (header, card, dropdown) distinct from the page background.
_Avoid_: panel, container, box

**Accent**:
A green highlight used for links, headings, glossary terms, or focus outlines.
_Avoid_: highlight, brand color, lime

**Type token**:
A named semantic role for text sizing (caption, small, body, lead, h1–h4) declared as a paired font-size and line-height CSS custom property, identical at every width with no breakpoint step; headings h1–h4 are sized once by global element rules from these tokens.
_Avoid_: font-size value (as a raw literal), heading class, clamp (as the sizing mechanism)

**Breakpoint**:
A canonical viewport width at which the type scale and layout step: sm 480px, md 810px, lg 1100px, xl 1600px, applied mobile-first (min-width) only through the `respond-to` mixin.
_Avoid_: media query (as the concept's name), tablet/desktop names, legacy widths (419px, 900px, ~1000px)

### Dashboard

**Dashboard**:
The top-level home route view that assembles the aurora, solar-wind and webcam panels into one-, two- or three-column layouts.
_Avoid_: home page (when the assembled panels are meant), dashboard (lowercase, as a synonym for the Interpreter)

**Dashboard panel**:
One top-level collapsible unit on the Dashboard: Aurora now, Summary, Oval glow intensity, Possible locations, Pinned webcams, Forecast, Solar wind or Magnetosphere.
_Avoid_: section (when the Dashboard unit is meant), card (the live cards inside Solar wind and Magnetosphere), widget

**Summary**:
The Interpreter paragraph as its own Dashboard panel, headed Summary, with its time-ahead selector, As-of line and Aurora guide link.
_Avoid_: aurora summary (without the panel qualifier), explainer panel

**Oval glow intensity**:
The Oval map with its forecast time, glow intensity table and color-blind toggle, as its own Dashboard panel headed Oval glow intensity.
_Avoid_: oval map (when the panel is meant), aurora map

**Possible locations**:
The Reach towns list as its own Dashboard panel, headed Possible locations.
_Avoid_: town list, visibility list

**Compact**:
A per-panel dense-mode checkbox (compress icon left of the label) on Solar wind, Magnetosphere and Pinned webcams; persisted per panel, default off.
_Avoid_: Compact view (the removed global toggle), condensed mode

**Arrange modal**:
The Dashboard header's native dialog for rearranging panels, opened by the header's Rearrange button and mounted only while open, with one reorder list per layout bucket (1-column, 2-column, 3-column). Panels are moved by mouse drag, per-row move buttons and arrow keys, all inside the dialog; Apply saves all buckets and re-renders, Reset-to-default restores the agreed defaults into the draft, and Cancel, Escape, the backdrop and X discard. A closed dialog returns focus to the trigger.
_Avoid_: layout editor, drag dialog (as the control's name)

**Layout bucket**:
One Dashboard column shape: 1-column below md, 2-column from md to below xl, 3-column at xl and above, plus the landscape-phone exception; each bucket stores its own column membership.
_Avoid_: viewport (without the bucket qualifier), responsive mode

**Jump to top**:
The shared page-footer's static button, hidden unless the page overflows, that returns scroll to the top and moves focus to the page h1.
_Avoid_: back to top (as the label), floating button

**Document title**:
The browser tab text derived from the page h1 as `{H1} – Space Weather`, updated on every route change with no dynamic suffixes.
_Avoid_: page title (without the h1-derivation qualifier), tab name

### Webcams

**Webcam**:
A third-party live sky camera image feed displayed on the webcams page, refreshed by its operator on a published cadence; the app only embeds feeds whose operator permits it and always attributes the source.
_Avoid_: live feed (without caveat), aurora cam, sky camera

**Camera station**:
The physical site and its operator pair behind a webcam (e.g. UEC Tromsø AI at Tromsø, Norway); the unit of attribution.
_Avoid_: cam site, webcam (when the station is meant)

**Webcam link**:
A webcams page entry that links out to a video-only or unembeddable webcam (YouTube/Twitch stream, site player, HTTP-only still) instead of displaying an image; gallery items are either webcams (image cards) or webcam links.
_Avoid_: video cam, stream entry

**Live cam**:
The one webcam entry (UAF Poker Flat) that follows its operator's CORS-open SSE feed for ~5–15 s frames while live updates are on, instead of reloading an operator-cadence still; it renders as its own card like the Twitch stream, with an honest "live feed unavailable" fallback on feed failure.
_Avoid_: live feed (without caveat), streaming cam

**Live updates**:
The per-card opt-in switch on the live cam that gates its SSE feed; it only takes effect while the global auto-refresh setting is on and the tab is visible.
_Avoid_: live mode, live toggle (internal names only)

**Loaded stamp**:
The webcam card's freshness line — "Loaded HH:MM. Refreshes every N min." — where HH:MM is when this browser last pulled the still, rendered in the Display timezone; never the operator's capture time, which browsers cannot read without CORS. The live cam's variants say live-feed cadence or placeholder frame instead.
_Avoid_: loaded at, capture time

### Local conditions

**Local conditions**:
A place-based view that shows whether tonight is dark and clear from a chosen location: daylight and twilight times plus weather cloud, temperature and humidity. The location is a stored geocoded place, not the user's device by default.
_Avoid_: conditions in my area (as a term), local weather (when the dark window is meant)

**Geocoded place**:
A location the app resolved from freeform text via Nominatim into latitude, longitude, display name and short name, or from the browser geolocation. The app stores the last chosen place in localStorage; the user picks from up to five Nominatim matches. When nothing is stored the app defaults to Luleå, Sweden.
_Avoid_: location (without geocoded qualifier when the stored place is meant), pin, marker, coordinates (as a manual entry)

**Device location**:
The coordinates from a single shot of the browser geolocation via the find my location button, shown as a geocoded place whose display name comes from Nominatim reverse geocoding (fallback "My location"). Distinct from the stored geocoded place: it is a fresh fix, not a persisted pick.
_Avoid_: my position, GPS fix (as a user-facing term), location (without the device qualifier)

**Night**:
The interval at a geocoded place when the sun is below -18 degrees, between astronomical dusk and the next astronomical dawn. Distinct from bright twilight. The darkest band of the Local conditions luminosity timeline.
_Avoid_: dark hours, nighttime (without the -18 degree qualifier)

**Civil twilight**:
The interval when the sun is 0 to -6 degrees below the horizon at a geocoded place, between sunset and dusk and between dawn and sunrise. Still too bright for faint aurora.
_Avoid_: twilight (without civil/nautical/astronomical qualifier), dusk (when the whole interval is meant)

**Day length**:
The interval between sunrise and sunset at a geocoded place on one calendar day, shown as the width of the Day band in the Local conditions luminosity timeline. Distinct from Night.
_Avoid_: daylight hours (as a displayed value)

**Astronomical twilight**:
The interval when the sun is 12 to 18 degrees below the horizon at a geocoded place, between nautical dusk and Night and between Night and nautical dawn. One of the luminosity bands of the Local conditions timeline.
_Avoid_: deep twilight (when astronomical twilight is meant)

**Nautical twilight**:
The interval when the sun is 6 to 12 degrees below the horizon at a geocoded place, between civil dusk and nautical dusk and between nautical dawn and civil dawn. One of the luminosity bands of the Local conditions timeline.
_Avoid_: twilight (without the nautical qualifier)

**Day (Local conditions)**:
The luminosity band of the Local conditions timeline when the sun is above the horizon at a geocoded place, between sunrise and sunset. During midnight sun it spans the whole day.
_Avoid_: daylight (when the band is meant)

**Weather (Local conditions)**:
The Open-Meteo view at the geocoded place: current conditions and a 24-hour horizontally scrolling hourly strip, each with temperature, humidity, cloud cover (total plus the low/mid/high split where the contract carries it) and a WMO weather code rendered through the local lookup; the current block also carries precipitation (mm over the past hour), which the Live alert's hindrance gates read. Fetched once per place change plus each Refresh tap, with the "Updated at HH:MM, near {shortName}" fetched-at timestamp and a "Source: Open-Meteo" attribution.
_Avoid_: local weather (when the Local conditions weather card is meant), forecast (the NOAA products own that word)

**Three-day weather forecast**:
The daily Open-Meteo table split out of the Weather card into its own Local conditions section: one row per day with conditions, max/min temperature and sunrise/sunset.
_Avoid_: daily forecast (without the 3-day qualifier), weather table (when the split section is meant)

**WMO weather code**:
The World Meteorological Organization code (0–99) Open-Meteo returns for current, hourly and daily conditions, rendered through the closed local lookup file as short English text plus an icon name. Codes outside the lookup fall back to the safe "Unknown" entry.
_Avoid_: weather code (without WMO), WMO icon (the icon is a presentation of the code)

**Weather refresh**:
The always-enabled Refresh button at the top of the weather card that reissues the same Open-Meteo fetch for the same place and updates the fetched-at timestamp. Manual only – no polling and no refetch on focus, an intentional exception to the live polling discipline (ADR 0003, ADR 0005).
_Avoid_: refresh button (as a term), weather refresh (as a synonym for the timestamp)

### Plain language

**Interpreter**:
The plain-language summary in the Summary panel: ONE merged paragraph — one short sentence each for the Kp index, the solar-wind stream and the magnetic gate (hemispheric power stays expert-only) — always fully open, with a time-ahead selector for the L1 readings (from the value arriving at Earth now to the freshest measurement still in transit) and one As-of line. It ends with the Moon wash-out caveat (only while the Moon is above the horizon and lit enough to matter) and the View distance reach sentence ("Nearest glow 0-100 km away (Likely)."). The L1 claims run on 5-minute averages, never single 1-min readings — the Solar Wind panel's displayed current values use the same averaging. Deep links into the expert detail were removed in the human's decluttering pass; the numbers sit directly below, and one link to the Aurora guide closes the summary.
_Avoid_: translator, explainer panel, dashboard (the Dashboard is the whole page)

**Interval text**:
A pre-written sentence per value interval in the interpreter's tables: value → sentence key, level, wording, source. Tables are pure data over the existing product hooks, pinned per interval including boundaries; the mapping source of every claim rides with the sentence.
_Avoid_: canned text, template sentence, copy block

**Plain levels**:
The interpreter's three-step reading scale per row — calm / active / storm-like — plus the honest missing-data state ("no data", never zero). "Storm-like" is deliberately hedged: it names storm-range viewing conditions without asserting a NOAA storm scale level.
_Avoid_: severity colors as level names, storm (as the level's name on its own)

**Reach towns**:
The Possible locations panel's global town list, headed "Possible locations" (earlier "Towns where it may be visible"): one flag, town name and ranked probability per row. A town appears only while its approximate |geomagnetic latitude| is at or poleward of the Tips reach edge (66° − 2° × Kp) and the sun there is at or below −12° (astronomical twilight or darker). At most one town per probability per country (largest margin wins, then alphabetical), ordered Very likely first and capped at 12 rows; nothing renders when no town qualifies. The probability is one of three ordinal words — Possible / Likely / Very likely — never a percentage; the icon ranks them by filled bars and its colour is redundant. The list is an approximate average in geomagnetic latitude, not geographic, and never a per-town promise.
_Avoid_: city strings (the NOAA Scales US rows that ship nowhere), town list, visibility list

**Darkest (window)**:
The weather line's label for the deepest darkness the reference day reaches at the stored place — "Darkest (night): 22:38 to 02:23." when the sun crosses −18°, otherwise the deepest twilight band it reaches (astronomical, nautical, then civil, named in the parentheses), so a nightless summer day still names its darkest stretch. Midnight sun reads "Polar day." and deep polar night "Darkest (night): all day." Times render in the Display timezone.
_Avoid_: dark hours, night window (without "darkest" or the band qualifier)

**Aurora guide**:
The read-through narrative page at `/about/guide`, reachable as the About submenu's Aurora guide entry and linked once from the end of the Interpreter. Five sections in the evening's order — what auroras are, when to look, where to look, what can hide aurora, before you go out — written for a layman or traveler: terms open the shared glossary popups, where-to-look is latitude-aware and defers the live position to the Dashboard's Oval glow intensity and View distance anchors (`/#oval-glow`, `/#view-distance`), never a blanket "face north". Every claim stays inside the honesty bounds: no promises, no colour promises, no city strings, no light-pollution numbers.
_Avoid_: guide page, what-are-auroras page

### Offline and personal oval

**Offline (PWA)**:
The app shell and last fetched products cached by the Service Worker so the app opens without internet after one online visit. Data is shown as stale with `As of` plus `⚠ Showing saved data — couldn't reach NOAA` when the network fails; no data is invented. First visit must be online; iOS may evict the cache after 7 days without launch. The saved NOAA products and OVATION imagery keep for 7 days in the runtime caches, and the Local conditions weather is saved in localStorage (`sw:local-conditions:weather:v1`) with its original fetch instant, so an offline reload still shows it behind the weather card's saved-data line. An open tab that survives a deploy reloads once onto the new shell instead of crashing on a missing route chunk.
_Avoid_: offline mode (as a toggle name), available offline (without As of qualifier)
**Oval**:

The forecast glow painted from `ovation_aurora_latest.json` per 1° cell on one pole-to-pole world canvas (ADR-0007). `Aurora 0` is transparent (no forecast). `1-5` faint, `6-10` moderate, `11-15` strong, `16+` intense (calibrated live; `max 25` quiet, higher in storm) are the semantic bands for the view distance and the on-demand glow intensity table; the default paint is a continuous color ramp that fades low values toward transparent, over a land basemap rendered from bundled Natural Earth data through the same projection. OVATION's grid-edge rows (lat `0`, `-1`, `90`, `-90`) are clipped as model artifacts. Each cell is a 30-minute forecast, not a live photo; cloud, moon and light pollution can still hide it.
_Avoid_: ovation map (when the forecast cells are meant), aurora oval (without forecast qualifier when the model is meant)

**View distance**:
The estimated band from the stored geocoded place to the nearest forecast oval cell with `Aurora ≥6` within 600 km: `Overhead / Nearby ~0-100 km • Likely / Distant ~100-300 km • Possible / Far ~300-600 km • Unlikely / Not in range` with a confidence label. A forecast estimate for the `Forecast Time` 30–90 min ahead, not a sighting guarantee. When the sun is too bright for aurora the line names the light instead of a band — "Daytime" with the sun up, "Civil twilight" while the sun sits 0 to −6° below the horizon — and reads a band only once it is darker.
_Avoid_: distance to aurora (without view / band qualifier), aurora x km away (as a single-number fact)

**Color-blind mode**:
The per-user toggle that keeps the map readable without color (ADR-0006, ticket 06): default shows the green-to-magenta color wash only; when on, the glow repaints through the viridis ramp – dark violet rising monotonically in lightness through blue, teal and green to opaque bright yellow – and the legend bar swaps to the same viridis gradient (permanent palette 2026-09-08; the earlier pure-brightness white ramp is commented out in `OvalGlow.tsx`). Viridis is perceptually uniform, so the lightness climb is the one channel every color-vision type (deutan, protan, tritan) and greyscale/night-vision reads identically, with hue as a redundant cue. The control is a checkbox pill like Compact (checkbox rendered on the right), sitting on the same row as the glow intensity table disclosure with space-between and wrap; it persists versioned under `sw:oval:cb:v1`, defaults off, and its checked state carries the mode. The canvas name notes the viridis ramp while it is on. No hatch or contour is layered on (approved deviation 2026-09-06: band-edge patterns cannot survive the continuous blurred gradient).
_Avoid_: color blind palette (as a persistent theme), accessible map (without the toggle name)
