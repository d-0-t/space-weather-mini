# 04: Full page composition with polar copy and external links

**What to build:** the daylight from ticket 01 and the weather from ticket 03 wired to the same geocoded place from ticket 02, with short polar day and polar night copy, concise local time labels for today and tomorrow and two external links baked with the current lat and lon. The 24 hour strip side scrolls and the timestamp and Refresh from ticket 03 stay.

**Blocked by:** 02, 03

**Status:** ready-for-agent

- [ ] Daylight and weather both follow the current geocoded place, today and tomorrow are shown together and the dark window for tomorrow is visible even when today is still light; times are labelled concisely in the place's local time
- [ ] Polar day renders "Sun does not set today" and polar night renders "Sun does not rise today" with the relevant twilight note, not a blank or an invalid date, pinned with a June at 69 N and a December at 69 N fixture
- [ ] A card with two external links is baked with the current lat and lon: "See light pollution at this spot on lightpollutionmap.info" with zoom and centre and a B0 layer preset, and "See live cloud cover on weather-radar-live.com" with the pin, each opening in a new tab with rel noopener noreferrer; no geographic map widget or Bortle number is fetched or stored
- [ ] The 24 hour hourly strip side scrolls without paging or pagination and the daily row stays at three cards; the Refresh button remains always enabled with the fetched at timestamp
