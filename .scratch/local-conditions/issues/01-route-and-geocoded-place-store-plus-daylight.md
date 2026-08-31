# 01: Route and geocoded place store plus daylight

**What to build:** a new top level Local conditions page at `/conditions` that is reachable from the primary nav after Webcams and shows daylight for a stored geocoded place. Opening the route with empty storage shows Kiruna, Sweden as the geocoded place without any network call, with daylight for today and tomorrow as calculated on device — sunrise, sunset, civil twilight start and end, nautical and astronomical twilight, dark window and day length — with Kiruna persisted as the last geocoded place.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Route `/conditions` is registered as a lazy route and appears in the primary nav after Webcams with label Local conditions, with one h1 per page and the existing nav tests updated
- [ ] A versioned store under `sw:local-conditions:place:v1` holds the geocoded place as display name plus lat and lon plus fetched at, reads the last place on load and falls back to Kiruna, Sweden on missing or corrupt data and writes on every pick
- [ ] Daylight for the current geocoded place is derived on device with suncalc for today and tomorrow, showing sunrise, sunset, civil twilight, nautical and astronomical twilight, dark window and day length, with no network fetch for solar times and with Oslo and Kiruna fixtures pinning the suncalc call
- [ ] Vitest covers the store read and write with versioning and Kiruna default and corrupt fallback, plus suncalc daylight for equinox, solstice and tomorrow shift
- [ ] Typecheck, build and the existing unit suite stay green
