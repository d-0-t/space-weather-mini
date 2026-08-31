# 0005: Local conditions page with suncalc and manual refresh, external map links for light pollution

We add a new route `/conditions` for Local conditions: a place-based view that shows whether tonight is dark and clear from a chosen geocoded place. Daylight and twilight times come from `suncalc` on the device, not from sunrise-sunset.org, so it works offline after the bundle loads and costs no quota. Weather comes from Open-Meteo `current` plus 12-hour hourly and 3-day daily with `timezone=auto`, refreshed only on user tap, not on a timer. Light pollution has no trusted free point API, so we link out to lightpollutionmap.info and weather-radar-live.com at the current lat and lon instead of inventing a Bortle number.

**Status**: accepted

**Considered Options**:

- New card on the dashboard — rejected, it mixes the remote NOAA flow with the local go or no-go flow.
- sunrise-sunset.org API for solar times — free and correct, but adds a fetch, needs attribution, fails offline, same polar nulls as suncalc.
- Polling weather every few minutes like ADR-0003 — rejected for this page, chasers on the page want control over refresh and battery, manual pull matches the audience better.
- Show a Bortle number via scraped QueryRaster — rejected, undocumented key, fragile, not honest about VIIRS yearly composites.

**Consequences**:

- Nominatim is queried only on Enter with up to five matches shown, 1 per second cap respected, attribution required, no per-keystroke calls. Browser geolocation is optional and overrides the text pick. Last place persists in `localStorage["sw:local-conditions:place:v1"]`; when empty the app defaults to Kiruna, Sweden as the geocoded place.
- `suncalc.getTimes` drives sunrise, sunset, civil, nautical and astronomical twilight, plus dark window. Polar day and polar night render short copy like "Sun does not set today" instead of blanks.
- Open-Meteo renders current plus a 24h horizontal scrolling hourly strip and 3-day daily, `timezone=auto`, manual refresh button always enabled with a timestamp.
- No numeric light pollution value is stored; the page links out to lightpollutionmap.info and weather-radar-live.com at the current lat and lon.
