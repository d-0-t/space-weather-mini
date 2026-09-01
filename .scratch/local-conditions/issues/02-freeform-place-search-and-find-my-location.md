# 02: Freeform place search and find my location

**What to build:** a freeform place search that queries Nominatim on explicit submit and a find my location button that single shots browser geolocation and overrides the pick, both updating the stored geocoded place and the daylight from ticket 01. Honest empty and busy states replace silent failure.

**Blocked by:** 01

**Status:** done

- [x] A freeform text field plus Search button queries Nominatim only on Enter or tap with `format=jsonv2`, `limit=5`, `addressdetails=1`, shows up to five matches by display name as a pick list with radio semantics and manual activation (arrow moves focus without selecting, Enter or click commits) and writes the chosen geocoded place to the versioned store
- [x] No per keystroke or autocomplete calls, throttled to at most one per second with in memory dedup by trimmed lowercased query, and the field footer shows the required "© OpenStreetMap contributors" attribution linked to osm.org per the Nominatim policy
- [x] Empty result shows "No match – try adding a country", 429 shows "Search is busy – wait a second" with RetryAfter respected when present
- [x] A secondary find my location button calls a single shot `getCurrentPosition` with high accuracy and short timeout and on success reverse writes the geocoded place via the same store shape; on permission denied or timeout it shows "Could not get your device location – type a place like 'Tromsø, Norway'" and does not offer a manual lat lon entry
- [x] Component tests with mocked fetch assert Enter only, five matches, pick writes store and updates daylight, the three honest error copies, and the attribution line

## Comments

- **2026-09-01 - implemented (review pending).** Seams confirmed with the team: a geocoding data module (`src/data/geocoding.ts`) that owns the Nominatim search client (dedup, throttle, RetryAfter, reverse geocode, geolocation wrapper) plus the existing `place-storage` seam and the page component. Real Nominatim jsonv2 fixtures checked in under `src/data/fixtures/` (Kiruna 2 matches, Springfield 5 matches, reverse Tromsø), captured live 2026-09-01.
- **2026-09-01 - find my location names the spot (human decision).** On geolocation success the page reverse geocodes the fix through Nominatim so the visitor sees a real place name and can verify the fix is right; "My location" is the honest fallback when reverse fails. The stored geocoded place keeps the fix's own high-accuracy coordinates, not the reverse response's snapped ones. Three error kinds (permission denied, timeout, unavailable) map to the one device location copy per the spec; the reverse call shares the search throttle because the 1 per second cap is per app.
- **2026-09-01 - RetryAfter extends the throttle window (human decision).** After a 429 the client's request gap grows to `max(1s, RetryAfter seconds)` for the next request, then resets on success. The busy copy stays constant.
- **2026-09-01 - never cache busy or failed.** The in-memory dedup map stores only settled outcomes (ok, no-match), so a retry of the same query after a 429 or a network failure goes to the network again instead of returning the stale failure from cache – the RetryAfter window would never apply to a cached busy. Pinned by a unit test.
- **2026-09-01 - policy details.** `accept-language` comes from the browser (`navigator.language`), and every request sends `referrer: location.origin` so the app names itself per the Nominatim policy (browsers forbid setting User-Agent). The fourth "Search failed – try again" copy covers plain network failures beyond the ticket's three, per the coding-standard plain-error rule and the ticket's own "honest states replace silent failure".
- **2026-09-01 - punctuation note.** The spec quotes the three error copies with em dashes; the repo's en-dash standard (enforced by `src/test/en-dash.test.ts`) wins, so code and tests use en dashes ("No match – try adding a country").
- **2026-09-02 - manual activation for radio pick list (a11y fix).** Arrow keys now move focus between the five matches without selecting; only Enter or click commits the pick. Implemented via `fieldset.onKeyDown` with roving focus via `radioRefs` and `onClick` instead of `onChange`, so the auto-select on arrow no longer fires. The search row now contains input + Search + Find my location with flex-wrap and 220px min-width, and the location header also wraps.
