# Webcams page — curated live sky camera gallery (client-side)

Status: ready-for-agent

## Problem Statement

Aurora chasers get forecasts, indices and alerts from the app, but no *sky*. The competitors all show webcams (SpaceWeatherLive's directory, My Aurora Forecast's cams, Shetland/UK cams), and for the field user a live sky camera is the ground-truth check before stepping outside. The app is client-side-only (ADR-0001) and will never run its own cameras; it already displays external imagery (OVATION JPGs, Kiruna magnetogram) so embedding operator-served webcam stills is a natural extension — provided the app stays honest about freshness, respects operators' licenses, and never wastes the chaser's data budget without consent.

## Solution

A new top-level route `/webcams` (nav entry **Webcams**, between Dashboard and Details) presents a **curated live sky camera gallery**:

`[Region filter chips + Show all/Hide all] [Auto-refresh setting] [Hidden sources (N)] → image cards (per region, latitude in title) → link rows (video-only / unembeddable sources) → "Looking for more?" note with EarthCam map link`

- **One gallery item per source** (no per-region cards). Image cards first; link rows after.
- **Image card**: title `{Station} · {lat}°N/S`, region tag, operator's current still (plain `<img>`, cache-busted on refresh), **"Loaded {HH:MM} · operator refreshes every {N} min"** (honest — CORS forbids a true timestamp), operator attribution + license note, "Visit site" link, FullSizeModal on click, Hide button.
- **Link row**: station, region, operator, kind note ("YouTube stream", "Twitch stream", "site player", "HTTP-only still"), external link in new tab.
- **Region filter chips**: one **native checkbox** per region present in the config (Scandinavia, Alaska, Canada, US, Antarctica, Australia, New Zealand, UK, Greenland, Russia — fixed display order, chips derived from data so a removed region disappears). Multi-select: checking one or more chips narrows image cards *and* link rows to those regions; **zero checked shows everything** (no artificial "All" chip). A **"Show all" / "Hide all"** native button pair toggles every chip at once (Show all clears them, Hide all checks them all — an empty gallery with an honest empty state); **neither button touches individually hidden sources** (the persisted hidden set is orthogonal to the region filter).
- **Hide** applies to *any* source type: the item leaves the gallery (its image is never fetched), a **"Hidden sources (N)"** button in the header — the count in the label, kept live — opens a dialog listing hidden entries with one-tap restore. Persisted in `localStorage["sw:webcams:hidden:v1"]` (array of ids, versioned).
- **Auto-refresh** is opt-in (`localStorage["sw:webcams:autorefresh:v1"]`, default off): a **native checkbox** setting with honest copy ("Auto-refresh images — uses data"). When on, image cards marked `refreshable` reload on their operator cadence (never faster than the source's own cadence, cache-busted); UAF Poker Flat follows its CORS-open SSE feed for true ~5–15 s live frames. Refreshing pauses while the tab is hidden (visibilitychange), mirroring ADR-0003. The manual refresh button always works.
- **Lights over Lapland** is the one video-embed card: Twitch iframe (`player.twitch.tv/?channel=lightsoverlaplandlive&parent=<domain>&autoplay=false&muted=true`) — nothing streams until the user presses play — plus a "Watch live on Twitch" fallback link.
- **Seasonal notes** ride on the config: a cam that shuts down for daylight/midnight sun (AuroraMAX off May–Aug, most all-sky cams in summer) shows its note on the card instead of a stale frame with no explanation.
- **"Looking for more?"** at the foot of the gallery: one honest line naming the coverage gaps (no verified cams in NZ/Tasmania, Siberia, UK, Iceland — link rows where they exist) + the **EarthCam world map** link for self-service during big storms.

## User Stories

1. As a chaser, I want a top-level **Webcams** page in the nav (route `/webcams`, own entry — webcams are not NOAA products), so that I can see live skies without digging through Details.
2. As a chaser, I want one gallery item per webcam or source — image cards first, video/unembeddable sources as link rows after — so that the page reads as a wall of cams, not a list of regions.
3. As a chaser, I want each image card to show the station name **with its latitude** (e.g. "Tromsø · 69.6°N"), the region, and the operator, so that I can judge a cam's relevance at a glance.
4. As a chaser, I want every card to carry "Loaded {HH:MM} · operator refreshes every {N} min" rather than a fake age, so that I know exactly how stale the sky I'm looking at can be.
5. As a chaser, I want per-region filter chips (Scandinavia, Alaska, Canada, US, Antarctica, Australia, …) over the gallery, so that I can isolate my hemisphere.
6. As a bandwidth-conscious chaser, I want to hide any source — image card or link row — so that it disappears from the gallery entirely (image never fetched), with a **Hidden sources** dialog to restore them, persisted across visits.
7. As a chaser with the page open on a second screen, I want an **opt-in auto-refresh** setting (a native checkbox, default off, honest data-use copy) that reloads image cards on their operator cadence and pauses when the tab is hidden, so that I can watch the sky without pressing refresh — on my terms.
8. As a chaser, I want the one truly live cam (UAF Poker Flat) to update itself via its SSE feed when auto-refresh is on, so that Alaska's sky is as fresh as the operator makes it.
9. As a visitor, I want Lights over Lapland embedded as a Twitch player that does **not** autoplay (nothing streams until I press play), with a fallback link, so that I get the famous cam without surprise bandwidth.
10. As a visitor, I want attribution and license notes on every card and link row, so that operators are credited and commercial-use restrictions are visible.
11. As a visitor, I want the "Looking for more?" note naming the coverage gaps plus the **EarthCam map** link, so that during a Kp8–9 storm I can find a cam anywhere myself.
12. As a keyboard/screen-reader user, I want alt text on every image ("{Station}, {region} — current sky view"), an `aria-label`/title on the Twitch iframe, dialog semantics + focus management on the Hidden sources dialog, **all selectable chips and settings as real native elements (checkboxes)**, and WCAG 2.1 AA throughout.
13. As a developer, I want the gallery driven by a typed config (`src/data/webcams.ts`) — one entry per source with id, name, region, latitude, operator, imageUrl, cadence, `refreshable`, license, note — so that a dead or licence-changed cam is a config edit, not a code change.
14. As a developer, I want every still URL verified hotlinkable (browser-UA + foreign-Referer probe, per `docs/research/webcam-sources-2026-08-29.md`) before it lands in the config, and the config contract tested.
15. As a chaser, I want **Show all** and **Hide all** buttons beside the chips that swiftly toggle every region at once — without affecting the sources I've individually hidden — so that I can clear the gallery or blank it in one tap, and an honest empty state when nothing matches.

## Implementation Decisions

- **Config as single source of truth** (`src/data/webcams.ts`, typed, no `any`): `WebcamImageEntry` (id, name, region, latitude to 1 decimal, operator, imageUrl, cadenceMinutes, refreshable, license: string | null, note: string | null, alt), `WebcamTwitchEntry` (id, name, region, operator, twitchChannel, note), `WebcamLinkEntry` (id, name, region, operator, url, kind: "youtube" | "twitch" | "player" | "http-only", note). The registry ships with the verified 2026-08-29 set from the research doc — all still-operating image sources, plus the video/unembeddable set as links. Jokkmokk is flagged `license: null` (no license text found — embedded with visible attribution per user decision; the risk member).
- **Ordering**: image cards grouped by region in the fixed region order (Scandinavia, Alaska, Canada, US, Antarctica, Australia), then Twitch/other embeds, then link rows grouped by region (New Zealand, UK, Greenland, Russia, rest). Chips order matches; chips render only for regions present in the config.
- **Refresh mechanics**: manual refresh = re-render `<img>` with `?t={Date.now()}`. Auto-refresh (on) = per-card `setInterval` at `max(cadenceMinutes, 1)`, cleared on visibilitychange-hidden, re-armed on visible; UAF uses an `EventSource` on `https://allsky.gi.alaska.edu/checkLive.php?cam=poker-flat` → latest frame URL → `<img src>`, with error fallback to a link row note. Twitch card never auto-refreshes (the player is live itself).
- **Native controls only**: region chips are native `<input type="checkbox">` styled as chips (multi-select; zero checked shows every region — no artificial "All" chip), the auto-refresh setting is a native checkbox (checked state is the announcement — no `aria-pressed` anywhere), the Hidden sources trigger is a native button, and the Hidden sources dialog uses the native `<dialog>` element (`showModal()` gives focus management and Esc for free; fall back to the app's existing modal pattern only if a blocker appears).
- **Hidden storage**: `localStorage["sw:webcams:hidden:v1"] = JSON.stringify(ids: string[])`, versioned; modal lists hidden entries with per-row Show and a "Show all" affordance; a hidden item stays hidden under every region filter.
- **Twitch parent param**: one `parent` value per deploy target (localhost for dev, netlify + gh-pages domains); component builds `https://player.twitch.tv/?channel={channel}&parent={parent}&autoplay=false&muted=true`, iframe `title`, no autoplay.
- **Freshness copy** is fixed shape: "Loaded {HH:MM local} · operator refreshes every {N} min". No fabricated ages (CORS). Seasonal cams add their note ("Operates when dark — currently inactive in summer").
- **Nav & routes**: `/webcams` route; nav entry "Webcams" between Dashboard and Details (`Nav.tsx:142` region); `Nav.test.tsx` extended. Webcams page follows product-page pattern (h1, freshness line, per `coding-standards.md`).
- **No new data colors**: cards use `--color-*` tokens; region tags are text/border chrome only (ADR-0002).
- **Vocabulary** per CONTEXT.md: **Webcam**, **Camera station**, **Webcam link** (added 2026-08-29); UI copy avoids bare "live".

## Testing Decisions

- **Config contract test** (`src/data/webcams.test.ts`): every entry has unique id, non-empty name/region/operator; every image entry has imageUrl (https), latitude, alt, cadenceMinutes ≥ 1; license is string or null; regions belong to the closed set; `refreshable` only on image entries.
- **Page component tests** with a small fixture config: image card renders title with latitude + region + "Loaded · refreshes every" + attribution + Visit site; link rows render after image cards; checkbox chips narrow both kinds (checked state asserted natively); Show all / Hide all toggle every chip without touching individually hidden sources; hide removes the item and writes `sw:webcams:hidden:v1`; Hidden sources dialog lists, counts, and restores; auto-refresh checkbox default off persists on; hidden-tab pause via mocked `visibilitychange` + fake timers; UAF adapter tested with a mocked `EventSource` (onmessage → img src updates, error → fallback note).
- **Axe/Playwright** (`e2e/webcams.spec.ts`): route `/webcams` with intercepted image responses; assert h1, chips, one card with latitude title, link rows after cards, toggle `aria-pressed`, modal opens with focus, axe audit green (per `coding-standards.md:36`); existing smoke journeys updated for the new nav item.
- **No snapshots**; assert external behavior per `coding-standards.md:39`.

## Out of Scope

- Own cameras, hosted/proxied imagery, scraping operator sites for metadata (alt-text weather data stays on the operator's page).
- User-submitted webcam links (curated set only; moderation is not a product feature).
- True timestamps/`Last-Modified` reads (blocked by CORS on all verified sources).
- Auto-refresh on by default, or any background refreshing when the tab is hidden (ADR-0003 discipline).
- Video autoplay anywhere (Twitch `autoplay=false` only; YouTube cams are links, not embeds).
- NZ/Tasmania, Siberia, UK, Iceland image cams — no verified embeddable stills exist (link rows only; gaps named in the "Looking for more?" note).
- Anything needing a backend (ADR-0001): Push notifications, server-side polling, stream proxying.

## Further Notes

- **Verification baseline**: all URLs in the config were probed 2026-08-29 (browser-UA, foreign-Referer, HTTPS check, cadence) — see `docs/research/webcam-sources-2026-08-29.md` §1–§6. Re-verify a URL before adding any new source; SWPC-style churn applies to cam operators too.
- **Licenses**: FMI rules-of-road (free non-commercial, cite), UCalgary/CSA credit, UEC academic credit, TGO credit, Panomax credit (non-commercial), AAD Commonwealth content, NPS public domain, IRF (non-commercial free; written permission for commercial use), Jokkmokk none found (risk member). Every entry's license rides in the config and renders on the card.
- **Region taxonomy** is data-driven; the fixed display order lives in the page component, the members in the config.
- **ADRs respected**: 0001 (client-side, no backend), 0002 (dark-only, tokens), 0003 (polling discipline by analogy), 0004 (this feature's own ADR).