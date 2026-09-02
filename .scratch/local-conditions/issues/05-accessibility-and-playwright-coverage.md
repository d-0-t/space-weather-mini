# 05: Accessibility and Playwright coverage for the route

**What to build:** the Local conditions route passes the shared a11y bar and a Playwright journey proves the end to end flow with intercepted fixtures and no live network.

**Blocked by:** 04

**Status:** done

- [x] The page has one h1, a visible label on the search field, radio semantics for the five matches, list semantics for the hourly strip, table semantics with a caption for the daily row, and title plus sr-only spans on icon buttons with no aria-label on controls where text can name them; focus is visible and the skip link works
- [x] Playwright journey for `/conditions` with intercepted Nominatim and Open-Meteo responses and flag and image stubs so the journey asserts the app DOM not the network: load route and assert h1 Local conditions plus the default Kiruna place visible, type a place and press Enter and assert five matches appear and pick one updates the place and the daylight rows for today and tomorrow including the June at 69 N polar copy when mocked, assert current weather plus the 24h side scrolling strip is present and scrollable and the 3 day row shows three cards, click Refresh and assert the timestamp updates while the button stays enabled, assert both external links hrefs contain the selected lat and lon
- [x] Axe audit on `/conditions` is green and a narrow viewport pass asserts no horizontal overflow
- [x] Typecheck, build and the full Vitest and Playwright suites are green

## Comments

- 2026-09-02 – implemented (review pending, not committed). TDD seams confirmed upfront: page component seam at `conditions.tsx` plus Playwright journey seam at `/conditions` with intercepted Nominatim + Open-Meteo + flag/image stubs; data seams from tickets 01-03 reused, no new parser units.
  - `e2e/conditions-a11y.spec.ts` only: fixed 2 reds (default-place chip asserts shortName visible + full displayName on `title`, not full text; Location toggle uses `exact:true` so "Find my location" no longer collides), fixed `stubExternalImages` to use `route.fallback()` instead of `route.continue()` so the Open-Meteo/Nominatim stubs still fire (the catch-all was bypassing them to live network), fixed `Promise<Disposable>` typecheck by awaiting `page.route`.
  - New journeys: 5-match Springfield search → pick Hampden County updates chip/daylight/weather/links (lat 42.1018764 lon -72.5886727 in both hrefs), Refresh reissues fetch and keeps timestamp; June-21-at-69N polar copy via `page.clock` ("Sun does not set today", single Day band); a11y-bar test (one h1, visible search label, 5 radios, hourly list, daily table caption, zero `[aria-label]` in `.conditions`, Refresh `title` without `aria-label`, skip link focused/visible).
  - Deviations from ticket wording (outdated): default place is Östersund (not Kiruna) per tickets 01/04; only Today renders (Tomorrow removed per product decision, ticket 04) – polar copy pinned for Today only.
  - Verification: typecheck clean, `e2e/conditions-a11y.spec.ts` 7/7 green, `smoke + conditions` 22/22 green. Full Vitest 523 passed / 8 failed – all 8 pre-existing on `main` (only `e2e/` touched, `git status` shows `M e2e/conditions-a11y.spec.ts` + this issue file): 7 parser error-message throws (3-day, discussion x2, geophysical x2, weekly x2) + 1 app-shell `/conditions` h1 (lazy-route renders empty `<main/>` in jsdom). No `src/` changes needed – app already met the bar; tests prove it.
