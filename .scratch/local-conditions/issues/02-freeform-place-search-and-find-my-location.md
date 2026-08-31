# 02: Freeform place search and find my location

**What to build:** a freeform place search that queries Nominatim on explicit submit and a find my location button that single shots browser geolocation and overrides the pick, both updating the stored geocoded place and the daylight from ticket 01. Honest empty and busy states replace silent failure.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] A freeform text field plus Search button queries Nominatim only on Enter or tap with `format=jsonv2`, `limit=5`, `addressdetails=1`, shows up to five matches by display name as a pick list with radio semantics and writes the chosen geocoded place to the versioned store
- [ ] No per keystroke or autocomplete calls, throttled to at most one per second with in memory dedup by trimmed lowercased query, and the field footer shows the required "© OpenStreetMap contributors" attribution linked to osm.org per the Nominatim policy
- [ ] Empty result shows "No match — try adding a country", 429 shows "Search is busy — wait a second" with RetryAfter respected when present
- [ ] A secondary find my location button calls a single shot `getCurrentPosition` with high accuracy and short timeout and on success reverse writes the geocoded place via the same store shape; on permission denied or timeout it shows "Could not get your device location — type a place like 'Tromsø, Norway'" and does not offer a manual lat lon entry
- [ ] Component tests with mocked fetch assert Enter only, five matches, pick writes store and updates daylight, the three honest error copies, and the attribution line
