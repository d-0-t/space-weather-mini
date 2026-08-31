# Conditions in my area for aurora watching — research

**Date:** 2026-09-01
**Audience:** Builders of the new "conditions in my area" panel
**Constraint:** Free APIs only, client side only per ADR-0001. No key, no proxy, no backend. Everything through `fetch` with CORS.
**Source discipline:** Every claim below traces to its owner. No summary blog stood in for the docs.

This is not a wish list. I checked each endpoint live on 2026-09-01 and read the policy pages that govern it.

---

## Summary

Three of your four asks have a clean free path. One does not.

Location search works with Nominatim freeform. Daylight and twilight work best without any API at all, using the small `suncalc` library that runs on the latitude and longitude you already have. Weather works with Open-Meteo, no key, and it gives you temperature, humidity, cloud cover and a WMO weather code in one call.

Light pollution is the outlier. There is no maintained free API that takes a lat and lon and returns a Bortle number you can trust. The visual tiles exist. The point lookup does not, at least not in a form you should bet a product on.

If you ship the first three and treat light pollution as a link out plus an optional visual tile, you stay honest and you stay free.

---

## 1. Location: freeform input to lat and lon with Nominatim

### What you asked

A freeform text field. The user types "Tromsø" or "Rovaniemi, Finland" or a street address. You turn that into latitude and longitude and then do everything else from there.

### The API that fits

`https://nominatim.openstreetmap.org/search` with `q=<freeform>` and `format=jsonv2`.

Docs: `https://nominatim.org/release-docs/develop/api/Search/` says the freeform `q` param is searched left to right then right to left if that fails. Commas help but are optional. You can add `addressdetails=1`, `limit=1..40`, and `accept-language`.

Live check on 2026-09-01: `https://nominatim.openstreetmap.org/search?format=jsonv2&q=Oslo&limit=1` returned Oslo at 59.91, 10.73 with `access-control-allow-origin: *` on a fresh cache miss. `OPTIONS` also returned `access-control-allow-origin: *`. So browser `fetch` works without a proxy. Open-Meteo status was the same.

The ODbL license applies. You must show "© OpenStreetMap contributors" with a link to `https://www.openstreetmap.org/copyright`.

### The policy you must respect

`https://operations.osmfoundation.org/policies/nominatim/` sets a hard ceiling of 1 request per second across all your users combined. It also says:

* Send a real User-Agent or Referer that names your app. Library defaults do not count.
* Cache results. Do not resend the same query.
* No autocomplete that fires a request per keystroke. The policy bans it by name.
* No bulk or grid searches, no scraping of details pages, and you must be able to switch API at their request.

In practice that means debounce is not enough. Do not call on every keystroke at all. Call when the user presses Enter or taps Search, or at most on blur after a 1000 ms settle. Keep an in memory map of query to result so repeated "tromso" does not hit the server again. Show the attribution line under the field.

If you violate it you will get 429 or 403 and an IP block. The policy says so plainly.

### Practical shape

* One input, one submit button. On submit, `fetch` with `format=jsonv2&limit=5&addressdetails=1&q=encodedTerm`.
* Show up to 5 candidates with `display_name` so "Springfield" is not a guessing game.
* On pick, store `lat` and `lon` as numbers plus the `display_name` in `localStorage` under a versioned key. Next visit, preload it but still let the user edit.
* Handle empty results with clear copy: "No match. Try adding a country, like 'Tromsø, Norway'."

### Fallback that also stays free

Open-Meteo has its own geocoding at `https://geocoding-api.open-meteo.com/v1/search?name=Berlin&count=5&language=en&format=json`. Live check showed CORS `*` and a payload with `latitude`, `longitude`, `timezone`, `country`, and `population`. No key, same 10k per day family of limits. It is less good at street addresses than Nominatim, but for "city, country" it is fast and has no 1 per second rule. Useful as a second source if you ever need to suggest while typing without touching Nominatim, or as a hard fallback when Nominatim 429s.

---

## 2. Daytime, sunrise, sunset, civil twilight: compute it, do not fetch it

### Two ways to do this

You have two real options. One is a network call. The other is math on the device. The math wins for this job.

**Option A — client math with `suncalc`**

`https://github.com/mourner/suncalc` and `https://www.npmjs.com/package/suncalc` describe a tiny dependency free library. `SunCalc.getTimes(date, lat, lon)` returns an object with 14 events:

* `nightEnd` and `night` for astronomical twilight
* `nauticalDawn` and `nauticalDusk`
* `dawn` and `dusk` which are civil twilight begin and end, sun at -6 deg
* `sunrise` and `sunriseEnd`
* `sunsetStart` and `sunset`
* `goldenHourEnd`, `goldenHour`, `solarNoon`, `nadir`

You already have lat and lon from step 1. One function call gives you every time you listed, plus a bit more. It works offline once the bundle loads. No rate limit, no attribution link, no network at all. That matters on a hill with bad signal.

Install is `npm install suncalc`, import as `import * as SunCalc from 'suncalc'`. The README shows the same call and the Kyiv table that lists each event by name.

For aurora use, the useful slice is: `dawn`/`dusk` for civil twilight, `nauticalDawn`/`nauticalDusk`, `nightEnd`/`night` for astronomical dark, plus `sunrise`, `sunset`, `solarNoon` and day length derived from `sunset - sunrise`. `SunCalc.getMoonIllumination` gives you moon phase if you want it later.

**Option B — network with sunrise-sunset.org**

`https://api.sunrise-sunset.org/` and `https://sunrise-sunset.org/api` document a free JSON API. No key. `GET https://api.sunrise-sunset.org/v2?lat=64.13&lng=-21.9&date=today` returns `sunrise`, `sunset`, `civil_twilight_begin`/`end`, `nautical_twilight_begin`/`end`, `astronomical_twilight_begin`/`end`, `day_length`, `solar_noon`, plus golden hour, blue hour, azimuth and moonrise and moonset. Attribution with a link to sunrise-sunset.org is required. CORS is `*` and the docs show a `fetch` example. Live check on 2026-09-01 for Reykjavik returned full civil and nautical twilight, with astronomical twilight as null in high summer, which is correct.

The new v2 endpoint defaults times to the local timezone of the coordinates, while v1 `https://api.sunrise-sunset.org/json?lat=...&lng=...&formatted=0` returns UTC and needs `tzid` to shift. Both are free for reasonable volume.

Why not prefer it: it adds a fetch you do not need, it needs its own error and loading state, it fails offline, and polar day handling is the same either way. The only reason to use it is if you want a second opinion or you need an official hosted source for times without bundling math.

### Recommendation

Use `suncalc` for this panel. Call `getTimes` for today at the stored lat and lon, format the dates in the user's locale, and show a row for each twilight line you care about. If you want to hedge, add a tiny footer "times calculated on device with suncalc" plus an optional "verify with sunrise-sunset.org" link that opens a prefilled API URL. That keeps you free and offline first.

Note on edge latitude: both suncalc and the API return null or invalid times during polar day and polar night. You will see `sun_status: "polar-day"` style responses from the API and `Invalid Date` style values from suncalc around 70 deg in June. Decide copy for that now: "Sun does not set today" is clearer than a blank.

---

## 3. Weather: conditions, temperature, humidity, cloud cover

### The API that fits the free constraint

`https://api.open-meteo.com/v1/forecast` is the one to use.

Primary docs: `https://open-meteo.com/en/docs` and the pricing and terms pages. The live behaviour matches the docs. No key, no sign up, `GET` with query params, JSON back, CORS `*`, `Content-Type: application/json`, GeoDNS to Europe and North America. Non commercial use is free up to 10,000 calls per day, 5,000 per hour, 600 per minute per `https://open-meteo.com/en/terms` and `https://open-meteo.com/en/pricing`. Attribution is required under CC BY 4.0. Self hosting is an option because the server is AGPLv3 at `https://github.com/open-meteo/open-meteo`, but you do not need it.

Live check on 2026-09-01:

`https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,relative_humidity_2m,cloud_cover,weather_code&timezone=auto`

returned `temperature_2m` 16.8 C, `relative_humidity_2m` 81, `cloud_cover` 82, `weather_code` 3, with `timezone` Europe/Berlin. Headers included `access-control-allow-origin: *` when an Origin was sent. So client `fetch` works.

### What to request for your panel

For "conditions in my area right now" you want the `current` block plus a short hourly window for the next hours.

A single call that covers your list:

```
https://api.open-meteo.com/v1/forecast
  ?latitude=<lat>&longitude=<lon>
  &current=temperature_2m,relative_humidity_2m,cloud_cover,weather_code,wind_speed_10m
  &hourly=temperature_2m,relative_humidity_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,weather_code
  &daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset
  &timezone=auto&forecast_days=3
```

Field notes from `https://open-meteo.com/en/docs`:

* `temperature_2m` is instant C at 2 m. `relative_humidity_2m` is percent. `cloud_cover` is total percent, with `_low`, `_mid`, `_high` split at 0 to 3 km, 3 to 8 km, 8 km and up. That split is handy for aurora chasers. Low cloud ruins you, high cloud is less bad.
* `weather_code` is a WMO code. The docs table maps 0 clear sky, 1 to 3 mainly clear to overcast, 45 and 48 fog, 51 to 67 drizzle and rain, 71 to 77 snow, 80 to 82 showers, 85 to 86 snow showers, 95 thunderstorm. You will need a small lookup file for icons and text. Open-Meteo does not send English strings, only the code.
* `timezone=auto` makes all times local to the coordinates. Without it you get GMT and you will format it wrong.
* `current` is built from the 15 minutely model where available, so it is fresh. `hourly` starts at 00:00 today local and gives 168 hours by default, 384 if you set `forecast_days=16`.

### Alternatives you could use but should not for free

* OpenWeatherMap free tier needs a key. That key leaks in client bundles unless you proxy. The brief says no key.
* MET Norway Locationforecast needs a strong User-Agent and has its own terms, but Open-Meteo already merges the MET Nordic 1 km model for the Nordic region per `https://open-meteo.com/en/docs` data sources table. So you get MET Norway benefit through Open-Meteo without a second call.
* WeatherAPI.com and similar are keyed and have tighter free limits.

So Open-Meteo is the simplest free fit and it already selects the best model per location, what the docs call "Best match".

### How to stay friendly to the free tier

The free tier is generous at 10k per day but shared across all visitors from their IPs via the browser. The right pattern is one call per location change plus a 10 to 15 minute poll at most while the panel is open, gated on document visibility. Do not poll every minute. Cache the last payload in memory and show "updated 3 min ago" with the `current.time` value.

You also need a WMO code to icon map. That lives in your repo, not the API.

---

## 4. Light pollution: where the free story breaks

### What you hoped for

Type a place, get back "Bortle 4, SQM 20.9" or similar for that spot.

### What actually exists for free

There is no stable free API that does that as a documented point lookup. I checked three paths.

**lightpollutionmap.info**

The site at `https://www.lightpollutionmap.info/` visualises VIIRS and DMSP data plus World Atlas 2015 sky brightness. Its `https://www.lightpollutionmap.info/help.html` credits `VIIRS: NASA VIIRS SNPP/NOAA-20` yearly composites and Falchi et al. 2016 `The new world atlas of artificial night sky brightness` at `https://doi.org/10.5880/GFZ.1.4.2016.001`, Science Advances.

People on the web have reverse engineered an internal endpoint like `QueryRaster/?ql=viirs_2021&qd=lat,lon&qk=<key>`. GitHub issue `RomanistHere/Measureland#26` documents it and notes the `qk` is scraped from the site JS and the response is a semicolon list of yearly radiances with an elevation after the comma. That endpoint is undocumented, not covered by terms, the `qk` rotates, and the author has a paid app at about 5 euros that is the real product. Relying on it from a shipped client is fragile and not what the site offers.

**NASA VIIRS Black Marble and GIBS tiles**

The real data behind the visual map is NASA Black Marble. `https://www.earthdata.nasa.gov/data/projects/black-marble` and `https://viirsland.gsfc.nasa.gov/Products/NASA/BlackMarble.html` describe the product suite VNP46A1 and A2 daily, A3 monthly, A4 yearly, 15 arc second, about 500 m at the equator. You can get the yearly composites through LAADS DAAC and you can visualise them as tiles through NASA GIBS. `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml` lists layers such as `VIIRS_DNB` and `VIIRS_Black_Marble`. Those tiles are free, no key, CORS reachable, and great as a map overlay. They do not answer "what is the Bortle at 64.13, -21.9" without server side raster math.

To get a number you would need to host a Cloud Optimized GeoTIFF of VNP46A4 and serve point queries with something like TiTiler at `/cog/point/{lon},{lat}` as described at `https://zenn.dev/wfukatsu/articles/f04d4a9e400057`. That is backend work and not free in the pure client sense. The earlier repo research `docs/research/aurora-chaser-features-2026-08-25.md` section 2.2 already noted that no competitor shows a Bortle tile and that VIIRS tiles plus `suncalc` moon is the client side ceiling.

Other sites in the same space like `https://lightpollutionmap.app/about-data/` and `https://codeberg.org/radiance/radiance-web` also wrap VIIRS, but they publish a viewer, not a stable point API you can call from JS with CORS.

**World Atlas 2015**

Falchi et al. 2016 at `http://doi.org/10.5880/GFZ.1.4.2016.001` is the academic source for "The new world atlas of artificial night sky brightness". Data is at `https://doi.org/10.5880/GFZ.1.4.2016.001` on GFZ Data Services, CC BY 4.0. It is a static dataset, not an API. You could bundle a coarse extract, but at global 30 arc second it is still heavy and still not a live free call.

### What to do instead and stay honest

Do not invent a Bortle value. The VIIRS radiance to SQM to Bortle step is not a simple formula. The lightpollutionmap.info help page says so directly and warns about spectral response and atmospheric scatter. The site even refuses to give a single conversion for that reason.

The product choice that stays free and honest is:

* Show darkness from what you can compute: solar elevation from `suncalc`, moon illumination from `suncalc`, civil and astronomical dark windows, cloud cover from Open-Meteo. That already tells a chaser if the sky is dark and clear.
* For light pollution, offer an honest card: "No free point API exists that returns a trusted Bortle for any lat and lon." Link the location to `https://www.lightpollutionmap.info/#zoom=15&lat=<lat>&lon=<lon>&layers=B0FFFFFFTFFFFFFFFFF` and to the help page. Optionally embed a VIIRS tile layer as a visual overlay behind the panel, with a note that the tiles are yearly composites and not live.
* If you ever need a real number without hand waving, the path is to host a VNP46A4 COG and add a tiny point endpoint. That is the ADR-0001 moment where a backend appears. Until then, do not fake it.

---

## 5. What to build first

Week 1 can ship a vertical slice that proves the whole idea without touching light pollution properly.

* Location field with Nominatim, with the policy guards: submit triggered, not keystroke, 1 per second, cache, attribution line, graceful 429 copy.
* On lat and lon, call Open-Meteo once with `current` and `hourly` plus `timezone=auto`. Render temp, humidity, cloud cover total plus low mid high, and a WMO icon and string.
* On the same lat and lon, call `suncalc` for today. Render sunrise, sunset, `dawn` and `dusk` as civil twilight, plus `nightEnd` and `night` for astronomical dark, plus day length. Add a small "polar day" guard.
* Light pollution card with honest copy and an external link with lat and lon baked in. Add a VIIRS tile preview later, not now.

That slice reuses one lat and lon through three consumers, respects every free quota, and tells a chaser the key triad: is it dark, is it clear, how cold and damp is it.

If you want to promise a number for light pollution later, put that promise behind an ADR that accepts a tile host. Do not promise it from free point lookups that do not exist.

---

## 6. Risks to carry forward

* Nominatim 1 per second is per app, not per user. Two friends testing at once can trip it. Handle 429 with a retry after header and cached fallback.
* CORS for Nominatim is present but varnish cached responses sometimes omit the header on a HIT, observed on 2026-09-01. A retry usually gets a MISS with the header. Keep `format=jsonv2` and `limit` small. Have Open-Meteo geocoding as a fallback branch.
* Open-Meteo `weather_code` needs your own text and icons. There is no string in the payload. Also note `is_day` exists as a helper if you want to dim icons at night.
* Both `suncalc` and sunrise-sunset.org return nullish values near the poles. Test at 69 N in June and December.
* Any light pollution number you show without a raster backend is either scraped or resampled. The gap is real. Name it rather than hide it.

---

## Appendix: sources checked live 2026-09-01

### Location

* Nominatim search API: `https://nominatim.org/release-docs/develop/api/Search/` — freeform `q`, structured fields, `format`, `addressdetails`, `limit`, `accept-language`.
* Nominatim usage policy: `https://operations.osmfoundation.org/policies/nominatim/` — 1 req per second, User-Agent, cache, attribution ODbL, no autocomplete, no bulk, 429 and 403 enforcement.
* Nominatim base: `https://nominatim.org/` — BSD licensed, OSMF public instance serves 30M per day, hosted at `https://nominatim.openstreetmap.org`.
* OpenAPI for search: `https://raw.githubusercontent.com/api-evangelist/nominatim/refs/heads/main/openapi/nominatim-search-api-openapi.yml` — verifies params and `200` shape.
* Open-Meteo geocoding: `https://open-meteo.com/en/docs/geocoding-api` and `https://github.com/open-meteo/geocoding-api` — `https://geocoding-api.open-meteo.com/v1/search`, `name`, `count`, `language`, no key, CC BY 4.0.
* Live: `https://nominatim.openstreetmap.org/search?format=jsonv2&q=Oslo&limit=1` → 59.91, 10.73 with `access-control-allow-origin: *` on fresh miss, `OPTIONS` also `*`. `https://geocoding-api.open-meteo.com/v1/search?name=Berlin&count=1` → Berlin 52.52, 13.41 with `access-control-allow-origin: *`.

### Daytime and twilight

* suncalc npm: `https://www.npmjs.com/package/suncalc` and `https://github.com/mourner/suncalc/` and `https://github.com/mourner/suncalc/blob/master/README.md` — `SunCalc.getTimes(date, lat, lon)` fields: `sunrise`, `sunset`, `dawn`, `dusk`, `nauticalDawn`, `nauticalDusk`, `nightEnd`, `night`, `solarNoon`, `nadir`, `goldenHour`, etc. Tiny, dependency free, client side.
* sunrise-sunset.org v2: `https://api.sunrise-sunset.org/` and `https://sunrise-sunset.org/api` — `GET https://api.sunrise-sunset.org/v2?lat=&lng=&date=` plus `tz`, `date_start` and `date_end`, local timezone by default, no key, attribution required, CORS `*`, fetch example.
* sunrise-sunset.org v1: `https://sunrise-sunset.org/api/v1` — `https://api.sunrise-sunset.org/json?lat=&lng=&date=&formatted=&tzid=&callback=` with CORS enabled 2015.
* OpenAPI for sunrise-sunset: `https://raw.githubusercontent.com/api-evangelist/sunrise-sunset/refs/heads/main/openapi/sunrise-sunset-json-api-openapi.yml`.
* Live: `https://api.sunrise-sunset.org/v2?lat=64.13&lng=-21.9&date=today` → full civil and nautical, astronomical null in high summer. Confirms local tz default and CORS `*`.

### Weather

* Open-Meteo forecast docs: `https://open-meteo.com/en/docs` — `https://api.open-meteo.com/v1/forecast` with `latitude`, `longitude`, `hourly`, `daily`, `current`, `timezone`, `forecast_days`, `past_days`, `models`, `cell_selection`. Tables for hourly variables include `temperature_2m`, `relative_humidity_2m`, `cloud_cover`, `cloud_cover_low`/`_mid`/`_high`, `weather_code`.
* Open-Meteo home: `https://open-meteo.com/` — free open source, AGPLv3 code at `https://github.com/open-meteo/open-meteo`, CC BY 4.0 data, GeoDNS, no key.
* Pricing and terms: `https://open-meteo.com/en/pricing` and `https://open-meteo.com/en/terms` — 10k per day, 5k per hour, 600 per minute free, CC BY 4.0, fair use.
* API directory: `https://github.com/api-evangelist/nominatim` style listing notes Open-Meteo supports CORS and HTTPS; also `https://github.com/open-meteo/open-meteo/blob/451a6383/openapi.yml` enumerates allowed enums.
* Live: `https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,relative_humidity_2m,cloud_cover,weather_code&timezone=auto` → temp, humidity, cloud Cover, WMO code with `access-control-allow-origin: *` when Origin present.

### Light pollution

* lightpollutionmap.info: `https://www.lightpollutionmap.info/` and `https://www.lightpollutionmap.info/help.html` — VIIRS yearly composites `AllAngle_Composite_Snow_Free` Black Marble 2.0 VNP46A4 and VJ146A4, cloud and aurora credits, World Atlas 2015 at `https://doi.org/10.5880/GFZ.1.4.2016.001`, conversion caveats for VIIRS radiance to MPSAS and why Bortle is not a direct formula.
* Alternative viewer: `https://www.lightpollutionmap.info/help.html` style also at `https://lightpollutionmap.app/about-data/` and `https://codeberg.org/radiance/radiance-web` — VIIRS GPX approaches, no stable point API.
* VIIRS data: `https://www.earthdata.nasa.gov/data/projects/black-marble` and `https://viirsland.gsfc.nasa.gov/Products/NASA/BlackMarble.html` — VNP46A1/A2/A3/A4 product table, daily to yearly, 15 arc sec, HDF-EOS5, Black Marble ATBD and user guide.
* GIBS: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml` checked for `VIIRS` layers.
* World Atlas dataset: `https://doi.org/10.5880/GFZ.1.4.2016.001` — Falchi et al 2016, GFZ Data Services, CC BY 4.0.
* Issue that documents the internal QueryRaster path: `https://github.com/RomanistHere/Measureland/issues/26` — shows `https://www.lightpollutionmap.info/QueryRaster/?qk=&ql=viirs_2021&qt=point_t&qd=lat,lon` with scraped `qk`, fragile and not for product use.
* Prior local research: `docs/research/aurora-chaser-features-2026-08-25.md` section 2.2 dark sky and 3.1 — noted no competitor has a Bortle tile, VIIRS tile overlay plus `suncalc` moon is the client ceiling.
* Lightpollutionmap.app points: `https://lightpollutionmap.app/` and `https://lightpollutionmap.app/llms.txt` style pages, `https://lightpollutionmap.app/knowledge/site.json`.

### Data sources notes for compliance

* OSM Nominatim data is ODbL `https://www.openstreetmap.org/copyright`. Open-Meteo is CC BY 4.0 `https://open-meteo.com/en/terms`. suncalc is BSD at `https://github.com/mourner/suncalc`. sunrise-sunset.org requires attribution link to `https://sunrise-sunset.org/`. VIIRS Black Marble is open science at `https://earthdata.nasa.gov/`, HDF-EOS5 at `https://ladsweb.modaps.eosdis.nasa.gov/`.

---

*Written from primary docs and live endpoints, 2026-09-01. Re-check quotas before you ship. Free tiers stay free only if you stay inside them.*
