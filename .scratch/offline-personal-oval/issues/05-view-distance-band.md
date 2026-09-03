# 05: View distance band + AuroraNow line + (i) explainer

**What to build:** Home’s `Aurora ~band from [shortName] (i) • Update location` line that tells the chaser in a band (not a single km) how far the nearest forecast oval is, with a simple non-technical explainer.

**Blocked by:** 02, 03, 04

**Status:** ready-for-agent

- [ ] Pure helper `distanceToNearestAurora(placeLatLon, grid, threshold=6, maxKm=600)` haversine to nearest cell `Aurora ≥ threshold`; `0` ignored, `>600` returns `Not in range`
- [ ] Band table rendered in `AuroraNow` under the images: `Overhead / Nearby ~0-100 km • Likely / Distant ~100-300 km • Possible / Far ~300-600 km • Unlikely / Not in range` with confidence; line reads `Aurora ~band from [shortName] (i)` plus `Update location` button opening the shared modal
- [ ] `(i)` popup is a `GlossaryTerm`-style explainer with the approved copy: `Each colored square is a 30-min forecast (1°). 0 = no color = no forecast there. 1 faint → 16+ bright. Nearest square ≥6 is the band, not a single km. Cloud/moon/town lights can still hide it. Forecast Time 30–90 min ahead.`
- [ ] Threshold stored versioned `sw:view-distance:threshold:v1` for migration; `Forecast Time` used for `As of`
- [ ] Unit test for helper with synthetic grids (cell at known lat/lon, threshold `6`, max `600`, all-zero → `Not in range`, overhead cell → `Overhead`); component test asserts line renders band from mocked place+grid, `(i)` opens, `Update location` opens shared modal
