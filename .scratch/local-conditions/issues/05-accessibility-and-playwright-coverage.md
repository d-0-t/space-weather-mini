# 05: Accessibility and Playwright coverage for the route

**What to build:** the Local conditions route passes the shared a11y bar and a Playwright journey proves the end to end flow with intercepted fixtures and no live network.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] The page has one h1, a visible label on the search field, radio semantics for the five matches, list semantics for the hourly strip, table semantics with a caption for the daily row, and title plus sr-only spans on icon buttons with no aria-label on controls where text can name them; focus is visible and the skip link works
- [ ] Playwright journey for `/conditions` with intercepted Nominatim and Open-Meteo responses and flag and image stubs so the journey asserts the app DOM not the network: load route and assert h1 Local conditions plus the default Kiruna place visible, type a place and press Enter and assert five matches appear and pick one updates the place and the daylight rows for today and tomorrow including the June at 69 N polar copy when mocked, assert current weather plus the 24h side scrolling strip is present and scrollable and the 3 day row shows three cards, click Refresh and assert the timestamp updates while the button stays enabled, assert both external links hrefs contain the selected lat and lon
- [ ] Axe audit on `/conditions` is green and a narrow viewport pass asserts no horizontal overflow
- [ ] Typecheck, build and the full Vitest and Playwright suites are green
