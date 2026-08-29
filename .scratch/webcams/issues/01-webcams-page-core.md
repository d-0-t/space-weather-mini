# 01: Webcams page core

**What to build:** A new Webcams page reachable from the nav, showing the curated gallery: one image card per embeddable camera station (the operator's current still, station name with latitude, region tag, operator attribution + licence note, honest "Loaded {HH:MM} · operator refreshes every {N} min" label, click for full size, "Visit site" link, Hide control), followed by link rows for video-only or unembeddable sources, the Lights over Lapland Twitch player card (no autoplay), and the "Looking for more?" note naming the coverage gaps with the EarthCam map link. All entries come from the typed webcam registry seeded with the verified 2026-08-29 source set.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The webcam registry holds one typed entry per source — image cards, Twitch embed, and link rows — shipping the verified 2026-08-29 set (all still-operating image sources plus the video/unembeddable links) with licence, seasonal note, latitude, and cadence fields; a contract test pins the entry shape and fails loudly on missing or invalid fields
- [x] Navigating to the Webcams route shows the gallery: image cards grouped by region in the fixed region order, link rows after them, every item showing station, region and operator; image card titles read "Station · Lat°N/S" and carry "Loaded HH:MM · operator refreshes every N min" (never a fabricated age)
- [x] The nav exposes a top-level Webcams entry (own route, not under Details) and the nav tests cover it
- [x] Clicking an image opens the full-size view via the existing modal pattern (Esc closes, focus returns); "Visit site" opens the operator's page in a new tab
- [x] Lights over Lapland renders as an embedded Twitch player that does not autoplay (nothing streams until the user presses play), with a "Watch live on Twitch" fallback link and a title on the iframe
- [x] The "Looking for more?" note names the coverage gaps (NZ/Tasmania, Siberia, UK, Iceland) and links the EarthCam world map
- [x] Typecheck, build and the unit suite are green

## Comments

Implemented 2026-08-29. Decisions made during implementation (deviations from the spec's registry shape are flagged):

- **Kaliningrad ships as an image card** (user decision: "aurora is possible at 54°. if there is an embeddable still, use it") — Russia is therefore an image-card region; the spec's image-region list predates this.
- **IRF Kiruna ships as an image card** with note "Seasonal" (user decision); nothing about whether it is active.
- **UAF Poker Flat imageUrl** is the verified daytime placeholder `https://allsky.gi.alaska.edu/images/offline-notdark.jpg` until ticket 03 adds the SSE frame resolution (`poker-notdark.jpg` is the off-season placeholder per user; swap in ticket 03).
- **Link rows ship the full SWL video/player set** (user decision): 21 rows incl. Shetland ×2, Graham's AllSky (http-only), Ilulissat/Tasiilaq, Teriberka, Landhotel/Aðaldalshraun, Kilpisjärvi/Levi/Posio, Fabian Wimmer Abisko, NIPR Skibotn (http-only), Churchill/Banff, Fairbanks, Sebec Lake, AAD Davis, Pizzo Matro, Cape Arkona. Brno ×4 excluded (research gives no video IDs); Lights over Lapland's own player page and the UAF Chatanika entry excluded as duplicates of the Twitch card / UAF image card.
- **`siteUrl` added to `WebcamImageEntry`** (spec's shape omits it) — required by the ticket's "Visit site opens the operator's page" and keeps a dead cam a config edit, not a code change.
- **`rest` region bucket** added to the region set for the SWL entries outside the named regions (Brno-style rows); the page labels it "Other regions". Chips in ticket 02 derive from data — decide there whether "rest" renders a chip.
- **SGO Sodankylä and Syrjävaara ship as image cards** (STILL-NIGHT class, night-gated but operating; "all still-operating image sources" per the ticket); both have `license: null` (no licence text in the research). Jokkmokk remains the named risk member.
- **Ettelsberg (Germany, STILL-LIVE, not aurora-grade) left out** of the image cards — add in review if wanted.
- Twitch `parent` is the page's own `location.hostname` (works for localhost, Netlify, gh-pages without an allowlist).
- Pre-existing red suite fixed along the way: severity ramp assertions (stale 4-colour band values), MiniSparkline band data, stray `rgb(233,233,233)` in daily-geomagnetic-indices.scss, Nav submenu order restored to the tested Geophysical-Alert-first order, and the aurora-curtain Kp ramp added to the frozen-data exceptions in ui-palette-final.test.ts.
- E2E/Playwright journey for `/webcams` is ticket 04's scope (smoke spec untouched).

### Follow-up (post-review polish, 2026-08-29)

- **Jump to row**: pill links at the top ("Jump to: …", glass styling per `glossary-term.scss`) for every section heading — image regions, Twitch stream, Webcam links.
- **Card layout**: `webcams__cards` is now a grid `repeat(auto-fill, minmax(190px, 1fr))` — 5 cards per row at ~1200px container (container widened to 1200px), 4 at 1024, 3 at 768, 1 on phones. Cards are smaller (0.95rem title, 160px image cap).
- **Country tag**: `WebcamImageEntry` gains a `country` field (e.g. "Norway", "Sweden", "Alaska, US"); the card tag shows the country next to the title in a wrapping flex row (`webcam-card__header`) — the region bucket stays for grouping/filtering.
- **Attribution carries the link**: the licence line and "Visit site" link are gone; the card now reads "Source: {operator}" with the operator as the outbound link. The registry keeps the `license` field (contract + future use) but it is no longer rendered.
- Verified in a real browser (Playwright): 5-per-row at 1280px, pills wrap, no overflow at any tested width.

### Follow-up round 2 (2026-08-29)

- **Intro removed**; the Jump to row now sits directly under the h1.
- **Jump to top**: every section heading row (`webcams__region-heading`, flex `space-between`) carries a "Jump to top" link back to `#webcams` (the page root id).
- **Country → flag**: the country text tag is gone; each card title leads with the country's flag emoji (`webcam-card__flag`, `role="img"` + `aria-label` + `title` = country name). Mapping lives in the data module (`WEBCAM_COUNTRY_FLAGS`, `webcamFlag`), contract-tested for full coverage.
- **Panoramic cards**: `WebcamImageEntry.panoramic?: boolean` (set on both Panomax feeds); the card gets `webcam-card--panoramic` → `grid-column: span 3` at ≥768px (measured 714px vs 227px at 1280 — exactly 3 tracks), full-width below.
- **Twitch card**: `width: fit-content`; the "Nothing streams until you press play" line and the separate "Watch live on Twitch" link are gone; the attribution reads "Source: Lights over Lapland" linking `siteUrl` (lightsoverlapland.com) — `WebcamTwitchEntry` now carries `siteUrl`.

### Follow-up round 3 (2026-08-29)

- **Panoramic cards last, full row**: within each region the panoramic feeds sort last and span the whole grid (`grid-column: 1 / -1` — measured 1200px vs 227px at 1280, full width on mobile); no more 3-track holes.
- **Flags via flagcdn.com** (flagpedia download API): the emoji flags didn't render on the user's platform, so `WEBCAM_COUNTRY_FLAGS` is replaced by `WEBCAM_COUNTRY_CODES` (ISO alpha-2) + `webcamCountryCode`; each card title shows `<img src="https://flagcdn.com/16x12/{code}.png" srcset="32x24 2x, 48x36 3x" width=16 height=12 alt={country} title={country} loading="lazy">`. Contract test pins a 2-letter code for every country; browser check: 35 flags, zero failed requests.