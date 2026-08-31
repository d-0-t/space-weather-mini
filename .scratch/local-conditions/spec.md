# Local conditions — is it dark and clear from here

Status: ready-for-agent

## Problem Statement

The app shows what is happening on the Sun and in the magnetosphere, but a chaser standing in a town wants a simpler answer: is it dark, will the sky be clear, and how cold is it where I am. Today that takes three separate lookups. There is no place to type a town, no view of sunrise, sunset and civil twilight for that place, and no weather with cloud, temperature and humidity to judge if waiting outside is worth it. Light pollution also matters, but there is no trusted free point API that returns a Bortle number for any lat and lon.

## Solution

A new top level route `/conditions` called Local conditions. It is the place based companion to the Dashboard. The user types a freeform place name, picks from up to five Nominatim matches, or taps find my location. The last geocoded place persists in localStorage; when nothing is stored the app defaults to Kiruna, Sweden. From that lat and lon the page shows:

* daylight for today and tomorrow as calculated on device with suncalc: sunrise, sunset, civil twilight start and end, nautical and astronomical twilight, dark window and day length. Polar day and polar night render short honest copy instead of blank
* weather from Open-Meteo for the same place: current conditions, a 24 hour horizontal scrolling hourly strip and a 3 day daily row. Each shows temperature, humidity, total cloud with low, mid and high split and a WMO weather code rendered through a local icon and text map. All times use timezone auto so they read as local at the place
* a card with two external links baked with the current lat and lon: lightpollutionmap.info and weather-radar-live.com cloud cover map. No numeric Bortle is shown, per ADR 0005

Weather refresh is manual only. A Refresh button is always enabled and a timestamp shows when the data was fetched. Daylight needs no fetch and works offline once the bundle loads.

## User Stories

1. As a chaser, I want a top level Local conditions page at `/conditions` in the primary nav after Webcams, so that I can get a go or no go without digging through Details
2. As a chaser who opens the page the first time, I want Kiruna, Sweden prefilled as the geocoded place, so that I see useful dark sky data and a place I recognise from the webcams
3. As a chaser, I want a freeform text field and a Search button that queries Nominatim on Enter, so that I can type "Tromsø", "Rovaniemi, Finland" or a street without guessing a format
4. As a chaser, I want to pick from up to five Nominatim matches by display name, so that "Springfield" does not silently pick the wrong one
5. As a chaser, I want a find my location button that uses a single shot browser geolocation and overrides the text pick, so that I can get my exact spot without typing when I am already outside
6. As a chaser, I want the last geocoded place to persist across visits and reload without asking again, so that my home town just appears next time
7. As a chaser, I want the place search to be honest when it fails, so that I see "No match — try adding a country" for empty, "Search is busy — wait a second" for 429, and "Could not get your device location — type a place like 'Tromsø, Norway'" for permission or timeout, without a disabled dead end
8. As a chaser, I want required attribution under the field that reads "© OpenStreetMap contributors" linked to osm.org per the Nominatim policy, so that the free use stays compliant
9. As a chaser, I want daylight for today and tomorrow at the geocoded place: sunrise, sunset, solar noon, civil twilight start and end, nautical and astronomical twilight and dark window, so that I know how long I have to wait for dark
10. As a chaser at high latitude, I want polar day to read "Sun does not set today" and polar night to read "Sun does not rise today" with the relevant twilight note, not a blank or an invalid date, so that I am not confused in June or December
11. As a chaser, I want day length shown for today, so that I can plan after work
12. As a chaser, I want every time shown in the geocoded place's local time with a concise label, so that a chaser searching a town far from their device time is not misled
13. As a chaser, I want current weather at the geocoded place: temperature, humidity, total cloud with a small low, mid and high breakdown and a WMO code rendered as an icon plus short text, so that I see at a glance if low cloud will ruin me
14. As a chaser, I want a 24 hour horizontal scrolling hourly strip for the same place with per hour time, temp, humidity, cloud total and low/mid/high plus weather code, so that I can spot a clear window at 2 am without paging
15. As a chaser, I want a 3 day daily row with max and min temp plus weather code and sunrise and sunset for reference, so that I can decide which night to go
16. As a chaser, I want a single Refresh button at the top of the weather card that is always enabled and a timestamp like "Data from Open-Meteo at 21:40 local", so that I control refresh and always know staleness and I am never left with a disabled button
17. As a chaser, I want weather loading to show a clear busy state and weather failure to show a plain retryable error while keeping the last daylight view, so that a bad network does not wipe the whole page
18. As a chaser, I want two external links baked with my current lat and lon: "See light pollution at this spot on lightpollutionmap.info" and "See live cloud cover on weather-radar-live.com", each opening in a new tab, so that I can check yearly VIIRS light pollution and live satellite cloud without the app faking a number it cannot trust
19. As a chaser, I want the external links to encode zoom and center so clicks land on my geocoded place, not a generic country map
20. As a keyboard and screen reader user, I want the page heading hierarchy correct with one h1, labels on the search field and the geolocation button via visible text and sr-only spans, list semantics for the match list, table semantics for the daily row, role img only where a chart would be and no aria-label on interactive controls, so that WCAG 2.1 AA holds and the axe audit stays green
21. As a developer, I want geocoding, weather and solar times as pure testable units behind one data module seam, with real fixtures checked in, so that a NOAA or Open-Meteo format change fails loudly and not silently
22. As a developer, I want the WMO code to icon and text map as a closed data file with a contract test that covers all 27 WMO codes, so that a missing icon is a build break not a blank

## Implementation Decisions

- **Route and nav:** new top level route `/conditions` with nav label Local conditions placed after Webcams in the primary nav and implemented as a lazy route. The page follows the existing product page pattern of an h1 plus freshness info, but it does not live under Details because it is a place based companion to the Dashboard, not a NOAA text product

- **Geocoded place model:** the stored place is a typed value of display name, lat and lon plus a fetched at timestamp. Storage is versioned under a `sw:local-conditions:place:v1` key with a JSON shape and a safe parse that falls back to Kiruna on corrupt or missing data. Kiruna, Sweden at 67.8558 N 20.2253 E is the default when nothing is stored, chosen because it is dark sky relevant and already has a webcam the user may recognise. The model is described in CONTEXT.md as Geocoded place

- **Nominatim contract:** freeform `q` with `format=jsonv2`, `limit=5`, `addressdetails=1`, `accept-language` from the browser. Queries only on explicit submit from the field on Enter or Search tap, never per keystroke. Client side dedup by lowercased trimmed query in a small in memory map and one per second throttling so the app never breaches the 1 per second per app cap. On 429, read RetryAfter if present and surface the busy copy. On empty, surface the no match copy that suggests adding a country. The field footer always shows the ODbL attribution with a link to osm.org/copyright. Browser geolocation is a single shot `getCurrentPosition` with high accuracy, 8 s timeout, 60 s max age, with permission denied, timeout and unavailable each mapping to the honest device location copy. No manual lat lon entry is offered per the grill decision

- **Solar times contract:** solar times are derived on device with the `suncalc` library via a single pure function that takes lat, lon and a Date and returns the full set of 14 events plus derived dark window between astronomical dusk and next dawn and day length. That function lives in the shared solar helper that already contains `solarElevationDegrees` and `isSunBelowHorizon` for webcams, extended to expose civil and astronomical intervals. No network call is made for solar times. All returned Date values that are invalid or null due to polar day or polar night are normalised to null so the view can render the short polar copy. Times are formatted with `Intl.DateTimeFormat` and labelled concisely. Today and tomorrow are computed together so tomorrow's dark window is visible even when today is still light. This is ADR 0005 and reuses the existing solar math seam

- **Weather contract:** a single Open-Meteo fetch with `latitude`, `longitude`, `current=temperature_2m,relative_humidity_2m,cloud_cover,weather_code,wind_speed_10m`, `hourly=temperature_2m,relative_humidity_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,weather_code`, `daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset`, `timezone=auto`, `forecast_days=3`. Current is 15 minutely backed where available. Hourly starts at 00:00 local and returns 24 entries for the strip; the strip is a horizontally scrollable row, not paginated. Daily aggregates are rendered as three cards with cap. Units are Celsius and kilometres per hour only for v1. The WMO code map is a closed lookup from code to short English text and icon name, owned in the codebase, with a fallback for unknown. The page shows a fetched at timestamp at the top of the weather card and the Refresh button is always enabled; clicking it reissues the same weather fetch and updates the timestamp while preserving the selected place. Failure keeps the place and daylight visible and only swaps the weather block to an error with retry. TanStack Query is used with no refetch interval and no refetch on window focus, per ADR 0003's exception for this page, so weather only refreshes on explicit tap. Stale time is short so the cache is shown between manual refreshes. This respects the free tier of 10k per day with one call per place change plus user initiated pulls

- **External map links:** the link card builds two hrefs from the current geocoded place lat and lon. The lightpollutionmap.info URL encodes zoom, lat, lon and a B0 layer preset so the click lands centred on the place. The weather-radar-live.com link encodes the cloud cover map with a pin at the same coords. Both open in a new tab with rel noopener noreferrer and have no tracking params. No Bortle or SQM number is requested, stored or shown anywhere in the app, per the research finding that no trusted free point API exists

- **Styling and accessibility:** SCSS plus BEM per coding standards, colour tokens only from `:root` custom properties for non data chrome, frozen data tokens not used here because there is no Kp or A table. The search field uses a visible label, the match list uses radio semantics for the five options, the daily row uses a semantic table with a caption, the hourly strip uses a list with time as the label. No aria-label on buttons, instead title plus sr-only spans. Skip link, visible focus, reduced motion and one h1 per page are kept. Recharts is not used on this page in v1, so no chart accessibility pair is needed unless added later

- **Error and empty seams:** the page has three distinct empty states. No place yet is never shown in normal use because Kiruna fills it, but the component still handles a cleared store as "Pick a place to see if tonight is dark and clear" plus the field and button. Place load failure shows the honest busy or no match copy above the field. Weather failure shows the weather card error without clearing daylight or the place.

- **Vocabulary:** implementation and copy use CONTEXT.md terms Local conditions, Geocoded place, Dark window and Civil twilight, plus the existing Measures. No synonyms such as "conditions in my area" appear as a type name, though the marketing copy may still use that phrase for users.

## Testing Decisions

- **What makes a good test:** test external behaviour only. Feed real fixture JSON or text, assert what the user sees or what typed data is returned, not helper internals. No snapshot of parser output. Axe audit per page in Playwright.

- **Seam sketch:** propose one primary seam, the local conditions data module, which exports a small set of pure and async units behind a single public surface. This is the highest seam that keeps the page thin and keeps tests stable if the route moves.

  * pure: solar times for a fixed lat and lon and date, including polar day and polar night cases
  * pure: WMO code to text and icon map
  * pure: Nominatim response to typed geocoded place list mapping and ODbL attribution handling
  * pure plus storage: geocoded place store read and write with versioning and Kiruna default and corrupt fallback
  * async: Open-Meteo weather fetch and map from raw JSON to the weather view model, windowed to 24h hourly plus 3d daily
  * the page component then consumes that module through the same public functions, so component tests can mock fetch at the module boundary and assert rendered landmarks

  Existing seams are reused where they already exist. The solar helper seam already has polar tests in the webcams contract and can be extended. The webcam storage seam is the direct prior art for the place store seam. The product parser seam `string to Product` is the pattern for the WMO map and for the weather map.

  If a reviewer prefers two seams, the acceptable split is one data seam as above and one component seam for the page render, still keeping the total low. The ideal remains one data seam that the page seam reuses.

  Ask to confirm: does a single data module seam that the page reuses match the team's mental model, or would the team rather split solar, weather and geocoding into three tiny modules each with their own seam. The spec assumes one.

- **Modules to test:** the local conditions data module with the five bullets above, the WMO map file, the storage helper, and the page component render of headings, place chip, daylight rows for today and tomorrow, weather current plus hourly strip plus daily row, refresh button and timestamp, and the two external map links with encoded lat and lon. The geocoding UI behaviour of Enter only, five matches and honest error copy is a component test.

- **Prior art reused:** Vitest parser unit tests with real NOAA fixtures checked in, plus the webcam contract tests for unique ids and required fields and the sun position tests for equinox solstice and polar day and polar night and before sunrise dark versus after sunrise light. Playwright journeys per page plus axe audit per the existing app shell and webcams audits. Component smoke tests that render landmarks and key copy without asserting internal state, mirroring the webcams view mode and filter dialog coverage.

- **Fixtures:** check in one real Nominatim jsonv2 response for "Kiruna" and one for a multi match term like "Rovaniemi", one real Open-Meteo json for Kiruna current plus hourly plus daily with timezone auto, and the WMO code coverage fixture that enumerates 0 to 99 where relevant. Keep each fixture small enough to read but large enough to prove the mapper tolerates unknown fields.

- **Playwright:** one journey for `/conditions` with intercepted image and API responses so the journey asserts the app DOM not the network. Steps: load route, assert h1 Local conditions and the default Kiruna place chip visible, type a place and press Enter, assert five matches appear, pick one, assert daylight rows for today and tomorrow and the polar copy when mocked with a June date at 69 N, assert current weather numbers plus the 24h scrolling strip is present and scrollable and the 3 day row shows three cards, click Refresh and assert the timestamp updates while the button stays enabled, assert the two external links hrefs contain the selected lat and lon, then run the axe audit. A narrow layout pass asserts no horizontal overflow.

## Out of Scope

- Any numeric light pollution value, Bortle or SQM, as a fetched number or derived number. The page only links out.
- Polling or background refetch for weather. Refresh is manual only, which is an intentional exception to the live polling discipline in the coding standards for this page.
- Manual lat lon entry, bulk geocoding, autocomplete per keystroke or grid search. The Nominatim policy forbids them and the grill ruled them out.
- Unit toggle to Fahrenheit or miles per hour. Celsius and kilometres per hour only for v1.
- Moon illumination or phase, Bz, Kp or any NOAA space product on this page. That lives on Dashboard and Details.
- Server side raster for VIIRS tiles, COG hosting, or TiTiler point lookup for light pollution. That would be a backend per ADR 0001 and is not in v1.
- Push notifications, background sync or periodic sync. The app remains client side only.
- A map widget or tile embed for light pollution or cloud. v1 is list and link based; tiles are a later enhancement.

## Further Notes

- **ADRs respected:** client side only per ADR 0001, dark theme and token discipline per ADR 0002, manual refresh exception per ADR 0003, and this feature's own ADR 0005 which records the choice of suncalc over sunrise-sunset.org, Open-Meteo with manual refresh, and external map links over a scraped Bortle. The page does not introduce a new backend, so ADR 0001 stays accepted.

- **Data contracts:** Nominatim at `nominatim.openstreetmap.org/search` with CORS on a fresh miss and 1 per second hard cap across the app, ODbL with attribution required. Open-Meteo at `api.open-meteo.com/v1/forecast` with CORS, no key, 10k per day free for non commercial, CC BY 4.0. suncalc from `github.com/mourner/suncalc` and `npmjs.com/package/suncalc` is BSD and dependency free. lightpollutionmap.info yearly VIIRS composites and weather-radar-live.com cloud map are external viewers, not APIs, with no CORS point lookup.

- **Quotas to keep in mind while building:** one geocode fetch on Enter plus optional one geolocation fix, one weather fetch per place change plus each manual refresh. Cache the weather payload in memory under the current place so a second refresh after a failure can fall back honestly. Keep the User Agent or Referer on Nominatim calls meaningful and keep an in memory dedup by trimmed lowercased query.

- **Research base:** `docs/research/aurora-local-conditions-2026-09-01.md` live checked all three free contracts on 2026-09-01, including the Nominatim OPTIONS CORS and the Open-Meteo current with cloud cover and the sunrise-sunset.org v2 shape, plus the finding that no stable free Bortle point API exists and why the scraped QueryRaster should not be shipped. That doc plus ADR 0005 is the provenance for this spec.

- **Sequencing suggestion for a follow on ticket cut:** a first ticket for the geocoded place store plus solar times pure unit, a second for the WMO map and Open-Meteo weather fetch plus manual refresh UI, a third for the page shell with Kiruna default, search field, match list, geolocation and honest errors, a fourth for the daylight and weather render with polar and timestamp copy, and a fifth for the external links card and Playwright plus axe coverage. Each ticket reuses the same data module seam.

