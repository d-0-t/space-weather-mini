# 03: Weather for the place with WMO lookup and manual refresh

**What to build:** weather for the current geocoded place as current conditions plus a 24 hour horizontal scrolling hourly strip plus a 3 day daily row, with temp, humidity, total cloud plus low, mid and high split and a WMO weather code rendered through a local lookup to short text plus icon, refreshed only on user tap with an always enabled Refresh button and a fetched at timestamp.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] A single Open-Meteo fetch with `current=temperature_2m,relative_humidity_2m,cloud_cover,weather_code,wind_speed_10m`, `hourly=temperature_2m,relative_humidity_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,weather_code`, `daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset`, `timezone=auto`, `forecast_days=3` for the current geocoded place, mapped from raw JSON to a typed weather view model, windowed to 24 hourly entries and three daily cards
- [ ] A local WMO code lookup file maps each relevant WMO code to short English text plus icon name, with a contract test that covers every used code and a safe fallback for unknown, not a geographic map widget
- [ ] Current block shows temp, humidity, total cloud with a small low, mid and high breakdown and the WMO icon plus text; the hourly strip is horizontally scrollable by time and shows per hour time, temp, humidity, cloud total and low/mid/high plus WMO icon and text; the daily row shows three cards with max and min, WMO icon and text and sunrise and sunset for reference; units are Celsius and kilometres per hour only for v1 and temps and clouds come from a real Open-Meteo Kiruna fixture checked in
- [ ] A Refresh button at the top of the weather card is always enabled and a timestamp reads "Data from Open-Meteo at HH:MM local" from the fetch time, clicking it reissues the same weather fetch for the same place and updates the timestamp while keeping daylight and the place visible; no polling and no refetch on focus
- [ ] Loading shows a busy state, failure keeps the place and daylight visible and only swaps the weather block to a plain retryable error
