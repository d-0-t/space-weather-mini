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
The chaser-set Kp value (1–9, default 5) that the alerts banner and opt-in browser notifications trigger on; G1 maps to Kp 5.
_Avoid_: alert level, trigger (without Kp)

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

### Local conditions

**Local conditions**:
A place-based view that shows whether tonight is dark and clear from a chosen location: daylight and twilight times plus weather cloud, temperature and humidity. The location is a stored geocoded place, not the user's device by default.
_Avoid_: conditions in my area (as a term), local weather (when the dark window is meant)

**Geocoded place**:
A location the app resolved from freeform text via Nominatim into latitude, longitude, display name and short name, or from the browser geolocation. The app stores the last chosen place in localStorage; the user picks from up to five Nominatim matches. When nothing is stored the app defaults to Östersund, Sweden.
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
_Avoid_: daylight (when the band is meant), daytime

**Weather (Local conditions)**:
The Open-Meteo view at the geocoded place: current conditions, a 24-hour horizontally scrolling hourly strip and a 3-day daily row, each with temperature, humidity, cloud cover (total plus the low/mid/high split where the contract carries it) and a WMO weather code rendered through the local lookup. Fetched once per place change plus each Refresh tap, with the "Updated at HH:MM, near {shortName}" fetched-at timestamp and a "Source: Open-Meteo" attribution.
_Avoid_: local weather (when the Local conditions weather card is meant), forecast (the NOAA products own that word)

**WMO weather code**:
The World Meteorological Organization code (0–99) Open-Meteo returns for current, hourly and daily conditions, rendered through the closed local lookup file as short English text plus an icon name. Codes outside the lookup fall back to the safe "Unknown" entry.
_Avoid_: weather code (without WMO), WMO icon (the icon is a presentation of the code)

**Weather refresh**:
The always-enabled Refresh button at the top of the weather card that reissues the same Open-Meteo fetch for the same place and updates the fetched-at timestamp. Manual only – no polling and no refetch on focus, an intentional exception to the live polling discipline (ADR 0003, ADR 0005).
_Avoid_: refresh button (as a term), weather refresh (as a synonym for the timestamp)