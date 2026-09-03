# 02: One place for the whole app (shared PlaceFinder modal)

**What to build:** Home and `/conditions` share one stored `geocoded place`. Both show an `icon+shortName` button that opens the same modal; picking a town in either place updates both, and `Find my location` is a one-shot.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] New reusable `PlaceFinder` modal component (search input, `Search` on Enter, up to five Nominatim matches with `display_name`, `© OpenStreetMap contributors` attribution, `Find my location` button)
- [ ] Single storage `localStorage["sw:local-conditions:place:v1"]` versioned, default `Östersund, Sweden` when empty; `device location` via `getCurrentPosition({enableHighAccuracy:true, timeout:8000, maximumAge:60000})` + Nominatim reverse (fallback `My location`), `±{Math.round(accuracy)}m` shown and `>200m` warning, only becomes stored place on confirm
- [ ] Home `AuroraNow` header shows `icon+shortName` button (icon-only + `sr-only` on narrow) that opens the modal; `/conditions` large place section refactored to the same button+modal
- [ ] Nominatim queried only on Enter, `limit=5`, `addressdetails=1`, 1/s cap respected, no per-keystroke calls per ADR-0005
- [ ] Component test: button renders, opens modal, Enter mocks Nominatim at URL boundary and shows five matches, `Find my location` mocks `geolocation` success/deny/absence and `±m`, picking writes the single key and is readable from both routes, focus trapped in modal
