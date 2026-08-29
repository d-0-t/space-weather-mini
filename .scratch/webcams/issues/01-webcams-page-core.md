# 01: Webcams page core

**What to build:** A new Webcams page reachable from the nav, showing the curated gallery: one image card per embeddable camera station (the operator's current still, station name with latitude, region tag, operator attribution + licence note, honest "Loaded {HH:MM} · operator refreshes every {N} min" label, click for full size, "Visit site" link, Hide control), followed by link rows for video-only or unembeddable sources, the Lights over Lapland Twitch player card (no autoplay), and the "Looking for more?" note naming the coverage gaps with the EarthCam map link. All entries come from the typed webcam registry seeded with the verified 2026-08-29 source set.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The webcam registry holds one typed entry per source — image cards, Twitch embed, and link rows — shipping the verified 2026-08-29 set (all still-operating image sources plus the video/unembeddable links) with licence, seasonal note, latitude, and cadence fields; a contract test pins the entry shape and fails loudly on missing or invalid fields
- [ ] Navigating to the Webcams route shows the gallery: image cards grouped by region in the fixed region order, link rows after them, every item showing station, region and operator; image card titles read "Station · Lat°N/S" and carry "Loaded HH:MM · operator refreshes every N min" (never a fabricated age)
- [ ] The nav exposes a top-level Webcams entry (own route, not under Details) and the nav tests cover it
- [ ] Clicking an image opens the full-size view via the existing modal pattern (Esc closes, focus returns); "Visit site" opens the operator's page in a new tab
- [ ] Lights over Lapland renders as an embedded Twitch player that does not autoplay (nothing streams until the user presses play), with a "Watch live on Twitch" fallback link and a title on the iframe
- [ ] The "Looking for more?" note names the coverage gaps (NZ/Tasmania, Siberia, UK, Iceland) and links the EarthCam world map
- [ ] Typecheck, build and the unit suite are green