# Webcam Sources Research — Space Weather Mini

**Date:** 2026-08-29
**Audience:** Builders of the planned "webcams" page — a curated gallery of live sky/aurora webcams displayed via plain `<img src>` tags.
**Constraint:** Client-side-only static SPA per ADR-0001 (Netlify/gh-pages, HTTPS). No backend, no proxy. Key nuance: `<img>` does **not** need CORS; what matters is (a) hotlink policy (403/Referer checks), (b) licensing/attribution, (c) URL stability, (d) update cadence. For any feed that needs a *fresh filename* resolved from JSON, CORS *does* matter — flagged per source.
**Scope:** Candidate cams from AuroraWatch UK, IRF Kiruna, Tromsø/Norway, Iceland, Finland, North America, plus aggregators. Every candidate verified with live HTTP requests 2026-08-29 UTC (browser-like UA; status/content-type/size/Last-Modified; one foreign-Referer hotlink probe per working source). Where a page is bot-blocked, that is itself a finding. **Two sweeps:** the morning sweep (§1–§5, appendix) and an afternoon sweep (§6: user-suggested candidates, SpaceWeatherLive sweep, geography hunt, Twitch/EarthCam verdicts).

> Primary sources only: each operator's own page/feed, fetched live. Nothing below is from a secondary write-up.

---

## Executive Summary

Nine live or conditionally-live aurora/sky camera feeds were verified. **No source applies Referer/hotlink checks** (all returned 200 with a foreign `Referer`). The two best all-rounders are:

- **Tromsø AI / UEC (Tromsø, Abisko, Kiruna, Skibotn)** — HTTPS, stable `latest_*.jpg` URLs, refreshing ~1–8 min, 18–165 KB. Best "drop-in `<img>`" set, four Nordic locations from one operator.
- **UAF Allsky Aurora Camera (Poker Flat, Alaska)** — HTTPS, CORS-open SSE endpoint (`Access-Control-Allow-Origin: *`) returns the current timestamped filename; frames every ~5–15 s at night. Best live-action feed, but night-only and filename-per-frame.

Also verified live: TGO Skibotn ASC01 + BACC colour cam (UiT, minute cadence when dark) and NIPR Watec Skibotn (minute cadence, **HTTP only** — breaks on an HTTPS page via mixed-content auto-upgrade, so demoted).

**Biggest traps found:** (1) *seasonal daylight gates* — every all-sky camera above freezes during midnight sun / daylight (several were stale at check time simply because it is late August); (2) *zombie streams* — NIPR Tromsø/Longyearbyen/Sodankylä and KHO Svalbard return 200 with months-old files; (3) *retired services* — yr.no webcams, MET Norway webcam API, AuroraMAX (CSA) are gone; (4) IRF Kiruna's cam is currently 15 h stale (seasonal start/outage — re-verify before shipping). See [§4 Risks].

---

## 1. Ranked shortlist — verified viable

All checks 2026-08-29 UTC. "Hotlink OK" = 200 with browser-like UA **and** 200 with foreign `Referer: https://myapp.example.com/webcams`.

| # | Cam (operator) | Region | Image URL (stable) | Cadence | Hotlink OK | License / attribution | Caveats |
|---|---|---|---|---|---|---|---|
| 1 | **Tromsø AI — Tromsø** (UEC, Univ. of Electro-Communications, Japan) | Tromsø, NO | `https://tromsoe-ai.cei.uec.ac.jp/~nanjo/public/aurora_alert/latest.jpg` | ~1–8 min (advancing during test) | ✅ 200 + foreign-Referer 200; image/jpeg, 18 KB | Academic outreach feed; no license text on site (JS SPA). Credit "Automated Auroral Detection System in Tromsø (UEC/NIPR)" | Image is all-sky + overlay text. Sibling cams lag at times (Kiruna/Skibotn updated hours before test) |
| 2 | **Tromsø AI — Abisko** (same operator) | Abisko, SE | `…/latest_abisko.jpg` | ~1–8 min (fresh 13:53 UTC) | ✅ 200; 38 KB | Same | Same; seasonal (dark season only, but so are all aurora cams) |
| 3 | **UAF Allsky Aurora Camera — Poker Flat** (Geophysical Institute, Univ. of Alaska Fairbanks) | Fairbanks, AK, US | Frame: `https://allsky.gi.alaska.edu/PKR/tagged_cam/PKR_YYMMDDHHMMSS.jpg` — resolve current name via SSE `https://allsky.gi.alaska.edu/src/checkLive.php?cam=poker-flat` (**CORS: `*`**, retry 10 s) | ~5–15 s frames, night-only | ✅ 200 (image); SSE has `Access-Control-Allow-Origin: *` | Public monitor; no license page. Credit "Geophysical Institute, UAF" | **Filename per frame** → needs the SSE fetch (works client-side thanks to CORS `*`). Daytime returns placeholder `images/offline-notdark.jpg`. Gakona cam is "coming-soon", Toolik currently placeholder |
| 4 | **Tromsø AI — Kiruna** (UEC) | Kiruna, SE | `…/latest_kiruna.jpg` | ~1–8 min when running | ✅ 200; 165 KB | Same as #1 | Updated 01:51 UTC at test (night-gated) |
| 5 | **TGO All-Sky Camera ASC01** (Tromsø Geophysical Observatory, UiT) | Skibotn, NO | `https://fox.phys.uit.no/ASC/Latest_ASC01.png` | 1/min when sun < 2° below horizon (stated on page); frozen in daylight (verified) | ✅ 200; PNG 28 KB; foreign-Referer 200 | Academic; no explicit reuse license on page. Credit "TGO/UiT" | HTTPS works (verified). Daylight gate → frozen midday (Last-Modified ~13:55 UTC at 16:00 UTC test). Midnight sun season = no images |
| 6 | **TGO BACC#5 colour camera** (TGO/UiT + UiO, UNIS, FMI) | Skibotn, NO | `https://fox.phys.uit.no/ASC/BACC5.jpg` (+ keogram `BACC5_keo.jpg` 49 KB) | 1/min when sun < 10° below horizon | ✅ 200; 188 KB; foreign-Referer 200 | Same as #5 | Same daylight gate. BACC constellation spans Svalbard (KHO, stale), Ny-Ålesund (static), Muonio/Kevo (FMI, seasonal), Alomar (static) — see §2 |
| 7 | **NIPR Watec — Skibotn** (National Institute of Polar Research, Japan) | Skibotn, NO | `http://esr.nipr.ac.jp/www/optical/watec/skb/rt/wat_skb_rt1.jpg` | 1/min (verified advancing 13:57→13:58 UTC) | ✅ 200 (HTTP); 19 KB | Academic network feed; no license text. Credit NIPR | **HTTP only** — `https://esr.nipr.ac.jp` refuses TLS (000). Mixed content = auto-upgraded then blocked on an HTTPS SPA → **demoted**; would need HTTP hosting or manual workaround |
| 8 | **IRF Kiruna all-sky (KAGO)** (Swedish Institute of Space Physics) | Kiruna, SE | `https://www.irf.se/alis/allsky/krn/latest_medium.jpeg` (512 KB; full `latest.jpeg` 3.9 MB; keogram `latest_nkeogram.gif` 96 KB; movie `latest_movie.mp4`) | Stated 1/min; **currently stale** (Last-Modified 01:51 UTC — 15 h at test; re-verify) | ✅ 200; foreign-Referer 200; `X-Frame-Options: ALLOW-FROM` only affects iframes, not `<img>` | KAGO data license (see §1.8): free for scientific/non-profit; **commercial use needs prior written permission**; redistribution requires license acceptance | Page notes season starts late August — likely seasonal start / outage. 3.9 MB full-res is too heavy; use `latest_medium.jpeg` |

### 1.8 IRF KAGO license — key clauses (primary source: https://www.irf.se/en/forskning/kago/license/)
- Non-profit / scientific use **free of charge**; commercial reproduction **requires prior written permission** (Head of KAGO).
- Redistributing data obliges the licensee to pass the license on to third parties (link to the license page satisfies this in practice).
- "IRF requires permission from the Head of KAGO if data are to be published in any media" — for a free hobby app, emailing `urban.brandstrom@irf.se` (PI) before launch is the safe move.
- Displayed time/date must not be modified; time is UTC. Attribution: "IRF KAGO / Urban Brändström".
- Same license family covers the keogram and movie.

### 1.9 How the UAF SSE resolution works (verified)
`GET https://allsky.gi.alaska.edu/src/checkLive.php?cam=poker-flat` returns an SSE stream (`text/event-stream`, `Access-Control-Allow-Origin: *`, `Cache-Control: no-cache`):
```
id: 1788012037
retry: 10000
data: { "0": "PKR/tagged_cam/PKR_260829140029.jpg", … }
```
A client-side page can `fetch` it (CORS `*`), read the first `data:` line, and set `img.src = https://allsky.gi.alaska.edu/` + name. Same endpoint for `cam=toolik-lake`, `cam=gakona`.

---

## 2. Nice to have — works, with caveats

| Source | URL | Status at check (2026-08-29) | Caveat |
|---|---|---|---|
| **FMI MIRACLE all-sky keograms — Muonio** | `https://space.fmi.fi/MIRACLE/ASC/ASC_keograms/tmp_MUO_keo/Allsky_MUONIO.jpg` (180 KB) | 200; Last-Modified 2026-05-29 | **Seasonal** — frozen at last dark night (midnight sun). Resumes ~Sept. FMI "Rules of the road": free for teaching + non-commercial research, redistribution under same conditions, co-authorship offered for significant use (https://space.fmi.fi/MIRACLE/ASC/index.php?page=rules%20of%20road). Keogram, not full-sky frame |
| **FMI MIRACLE — Kevo** | `https://space.fmi.fi/MIRACLE/ASC/ASC_keograms/tmp_KEV_keo/Allsky_KEVO.jpg` | 200; 2026-05-29 | Same as above |
| **KHO Svalbard ZWO quicklook** | `https://kho.unis.no/Quicklooks/ZWO/Allsky.jpg` (+ `Keo_Allsky.jpg`) | 200; **Last-Modified 2026-03-24** | Svalbard polar night season ended — currently dead. HTTPS works. UNIS/KHO academic; no license page found. Listed as BACC#1 on TGO page |
| **NIPR Watec — Kilpisjärvi** | `http://polaris.nipr.ac.jp/~kstdev/opt/KIL/wat_kil_rt1.jpg` | 200; 2026-08-20 (9 days stale) | Intermittent; HTTP only |
| **UAF Toolik Lake / Gakona** | via `checkLive.php?cam=toolik-lake` / `cam=gakona` | 200; placeholders (`images/toolik-notdark.jpg`, `images/coming-soon.jpg`) | Not operational at check; same SSE mechanics as Poker Flat when up |
| **Shetland Webcams — Cliff Cam 3** (Sumburgh Head, famous UK aurora cam) | `https://www.shetlandwebcams.com/cliff-cam-3/` | Page 200 | **Video stream (HLS/HTML5), no static `<img>` feed**; some cams gated behind "Red-Eye Plus" membership. Recommended by AuroraWatch UK for UK aurora. Donation-supported (North Broadcast Ltd) |
| **AuroraWatch UK magnetometer plots** | `https://aurorawatch.lancs.ac.uk/summary/…/rolling_act.png` | Policy note only | Not a webcam; and their FAQ states **direct image embedding "will not work"** — plots must be embedded via their iframe mechanism (`/linking/`). Home page + map are fine to link to |

---

## 3. Dead, retired, or blocked — with evidence

| Source | What happened (evidence, 2026-08-29) |
|---|---|
| **yr.no webcams + MET Norway webcam API** | Listing page `https://www.yr.no/en/webcams` → 404 and `https://api.met.no/weatherapi/webcams/1.0/` → 404 (product retired from the API catalog). **CORRECTION (afternoon sweep):** the legacy *direct image URLs* still serve fresh frames (setermoen/3.jpg etc., 10–15 min cadence) — see §6.1 |
| **AuroraMAX (Canadian Space Agency)** | `https://www.asc-csa.gc.ca/eng/astronomy/auroramax/` → 301 to generic northern-lights page. **CORRECTION (afternoon sweep):** the project is alive at auroramax.com (UCalgary-led) with live images on `auroramax.phys.ucalgary.ca` — see §6.1 |
| **NIPR Watec — Tromsø, Longyearbyen, Sodankylä** | All return 200 but Last-Modified 2026-04-15 / 2026-04-06 / 2026-04-14 — months old. **Zombie streams**: status OK, content dead. The NIPR realtime page (http://pc115.seg20.nipr.ac.jp/www/opt/realtime.html) still lists them |
| **NIPR Watec — Kiruna** | 200 but Last-Modified 2025-09-17 — ~1 year stale |
| **Lights over Lapland aurora webcam page** | `https://lightsoverlapland.com/aurora-webcam/` → **Cloudflare managed challenge** for plain HTTP clients ("Just a moment…"). Page content unverifiable without a JS browser; commercial operator; skip unless images live on an unchallenged CDN (not found) |
| **Taivaanvahti / Ursa (Finland)** | `https://www.taivaanvahti.fi/cameras` → **Anubis proof-of-work anti-bot challenge** (needs JS) for curl and non-JS clients. Camera images (if any are public) are behind it |
| **vedur.is / Míla webcams (Iceland)** | `https://www.vedur.is/myndir/` → 302 to `http://193.4.200.58/myndir/` which **times out from our network** (connection timeout, port 80 and 443; `v1.myndir.vedur.is` no longer resolves). Either Iceland-only reachability or down. Unverifiable from this location — needs a local test before planning |
| **Skyline Webcams (aggregator)** | Works (200) but live images render through their JS player/CDN — no plain hotlinkable per-cam JPG pattern found in page HTML |
| **SpaceWeather.com** | No cam feeds; "realtime gallery" is user submissions (spaceweathergallery2.com); site links to Lights over Lapland instead |
| **Soft Serve News / Aurora Alerts cams** | Sitemap shows no cam pages; `webcams.html` → 404. Their remaining feeds are forecast images (`cdn.softservenews.com/Aurora.htm`) |
| **Abisko (Hiroshima Univ.) all-sky** | `http://www.wave.info.hiroshima-cu.ac.jp/obs/abisko/data/` → redirects, 404. Dead |
| **Explore.org UAF Aurora Cam** | Video-only (embedded player). Not `<img>`-compatible |
| **AuroraWatch UK own cameras** | Map layer "cameras" = placeholders: `cameras={"Lancaster #1":…,"Picam #1":…}` with popup "Watch this space!" (`/js/map.js`). Their map cam pins are third-party cams "used with permission" — none live |
| **Andøya Space / ans.kiruna.se / alcor-system OMEA** | Andøya 301 (restructure, no public feed found); ans.kiruna.se unreachable; alcor OMEA page is a product brochure with a 2022-dated sample image, not a feed |

---

## 4. Risks

1. **Mixed content kills HTTP-only feeds.** An HTTPS SPA auto-upgrades `http://` image URLs to HTTPS; when the server has no TLS (NIPR `esr.nipr.ac.jp` → connection refused), the image is blocked. NIPR Skibotn is live but unusable via `<img>` on HTTPS hosting unless the app is served over HTTP (it isn't). Filter for `https://` when curating.
2. **Seasonal / daylight gates are the norm, not the exception.** All verified cams freeze in daylight or midnight sun (TGO: sun > 2–10° below horizon; UAF: night-only; FMI keograms: dark season). A cam checked "live" in December can be frozen from May–August. **Ship a staleness badge** (age of `Last-Modified` is not visible to `<img>`; options: HEAD/fetch is CORS-blocked for these hosts — so display "camera seasonal — last frame May 29" style static copy per cam, or accept the frozen frame).
3. **Zombie streams return 200 with months-old content** (NIPR TRO/LYR/SOD/KRN, KHO Svalbard). A green "live" indicator is meaningless from HTTP status alone; only cross-checking Last-Modified over time catches this. Without CORS, client-side can't read Last-Modified — so the gallery should treat each cam as "probably stale after N hours" and show its known seasonal state.
4. **URL churn.** UAF Poker Flat = filename per frame (mitigated: CORS-open SSE). Others = stable overwritten filenames. Historical churn observed: yr.no retired entirely; AuroraMAX retired; TGO site moved hosts (geo.phys.uit.no → fox.phys.uit.no → https); IRF moved allsky to `irf.se/alis/` and its license PDF URL 404s (old links rot).
5. **Operator policy shifts.** IRF KAGO license requires written permission for commercial use and for "published in any media" — a hobby app is fine (non-profit) but email the PI before launch to be safe. FMI wants co-authorship offered for significant use of camera data (overkill for display, but cite them). AWUK forbids direct embedding of its plots (iframe-only) — do not hotlink AWUK assets.
6. **Anti-bot walls on pages, not necessarily on images.** Cloudflare managed challenge (Lights over Lapland) and Anubis PoW (Taivaanvahti) block page scraping; image CDNs behind them were not locatable — treat as unverifiable, re-check with a real browser if the source is important.
7. **Geo-blocking / Iceland.** vedur.is webcam server (193.4.200.58) unreachable from our network; verify from Iceland or a EU/US VPS before promising Icelandic cams.
8. **robots.txt:** checked — `irf.se/robots.txt` exists (no disallow rules); `fox.phys.uit.no`, `allsky.gi.alaska.edu`, `tromsoe-ai.cei.uec.ac.jp` have none. Nothing blocks crawlers; still, keep per-cam poll cadence polite (30–60 s for minute-cadence cams; the SSE has `retry: 10000` built in).

---

## 5. Suggested gallery composition (if shipped today)

- **Tromsø AI**: Tromsø + Abisko + Kiruna + Skibotn — one `<img>` per cam, zero JS, HTTPS, stable URLs. Cover four Nordic locations; refresh `src` on a 60 s timer with a cache-busting query (`?t=…`; the files are served fresh, but browsers may cache — the UEC page itself appends `?`).
- **UAF Poker Flat**: needs one `fetch` of the SSE endpoint (CORS `*`) per refresh to resolve the frame name — the only "live-action" cam (5–15 s frames) and the only North American feed verified live.
- **TGO Skibotn**: ASC01 + BACC5 as static `<img>` (minute cadence when dark).
- **IRF Kiruna**: `latest_medium.jpeg` — but **verify freshness first** (stale at time of writing); also the least permissive license of the set.
- Avoid: NIPR (HTTP-only), FMI/KHO (currently seasonal-stale), everything in §3.

---

## 6. Sweep #2 — user-suggested candidates + SpaceWeatherLive sweep (2026-08-29, afternoon UTC)

Second live sweep: the four user-suggested candidates (Jokkmokk, IRF Kiruna re-check, Lights over Lapland + Twitch, SpaceWeatherLive cheat sheet), a geography hunt (Canada, NZ/Tasmania, Russia, UK, Iceland), and EarthCam. All checks 2026-08-29 afternoon UTC; browser-like UA; foreign-Referer hotlink probe per working source.

### 6.1 Corrections to the morning report

1. **yr.no webcams are not fully dead.** The listing page and API product are retired, but the legacy direct-image URLs still serve **fresh** frames: `yr.no/webcams/1/2000/setermoen/3.jpg` (observed 14:16 → 14:31 UTC), `ortneset/1.jpg` (14:15), `finnsnes/2.jpg` (14:17), `skjervoy/1.jpg` (14:24), `risoyhamn/1..3.jpg` — all 200 image/jpeg, ~10–15 min cadence, foreign-Referer 200, HTTPS. Orphaned URLs (no listing page), no terms found on the live files. Treat as stable-while-they-last.
2. **AuroraMAX is alive** — it moved from the CSA page to **auroramax.com** (led by University of Calgary; partners CSA, Astronomy North, City of Yellowknife). Camera: Yellowknife, NWT (62°26′N), colour all-sky, exposure 4 s. Images: `https://auroramax.phys.ucalgary.ca/recent/recent_{480p,720p,1080p}.jpg` — advancing 1–2 min apart in daylight at check; site JS refreshes every 3 s with `?t=` cache-buster; ~6 s frame cadence at night (site claim); **off May–August** (too bright). Credit per site: "Canadian Space Agency, University of Calgary, Astronomy North".

### 6.2 New verified candidates (ranked)

All: HTTPS ✓ (unless noted), no Referer protection (foreign-Referer 200) unless noted. Regions marked for the coverage map.

| # | Cam (operator) | Region | Image URL (stable) | Cadence at check | Hotlink | License / attribution | Notes |
|---|---|---|---|---|---|---|---|
| 1 | **Jokkmokk "PORJUS" NR2/NR3/NR4/NR5** (Maechan-net, Japanese-operated) | Porjus–Jokkmokk, Sweden (66.95°N) | `https://uk.jokkmokk.jp/photo/nr{2,3,4,5}/latest_m.jpg` (full `latest.jpg` also works — SWL links these) | ~20–60 s (4 cams fresh 14:19 UTC, still fresh at 14:31) | ✅ 200 both | No license/credit text on site (personal volunteer project with Arctic Colors sponsorship); credit "Nature of Jokkmokk / jokkmokk.jp" | 4 live of 6: **NR1 dead** (2024-05-01), **NRA all-sky dead** (2013-10-08). DSLR landscape+sky cams, run in daylight too (not dark-gated). 5–25 KB. Archives + movies per cam. Site links IRF, Jokkmokk/Gällivare cams |
| 2 | **FMI Aurorasnow — SIR_AllSky / SIR / HOV** (Finnish Meteorological Institute) | Hankasalmi, Nyrölä, Kirkkonummi, Finland | `https://aurorasnow.fmi.fi/public_service/images/latest_{SIR_AllSky,SIR,HOV}.jpg` | ~1–2 min (all three stamped together 14:20→14:22 UTC) | ✅ 200 both | FMI "rules of the road": free for teaching + non-commercial research, redistribute under same conditions, cite FMI (https://space.fmi.fi/MIRACLE/ASC/index.php?page=rules%20of%20road) | All-sky cams from the FMI AuroraSnow service; **update in daylight too** (not dark-gated — verified 14:22 UTC midday). Free state agency service |
| 3 | **AuroraMAX** (UCalgary + CSA + Astronomy North + City of Yellowknife) | Yellowknife, NWT, Canada | `https://auroramax.phys.ucalgary.ca/recent/recent_480p.jpg` (+`_720p`, `_1080p`) | ~6 s at night (site); 1–2 min observed in daylight | ✅ 200 both | Outreach project; site credits "Canadian Space Agency, University of Calgary, Astronomy North"; no restrictive terms found (JS SPA) | Seasonal: off May–Aug. All-sky colour, 180° fisheye. Refreshed with `?t=` on their own page (browser-cache aware) |
| 4 | **UCalgary TREx RGB — Gillam / Pinawa / Rabbit Lake** (Auroral Imaging Group) | Gillam MB, Pinawa MB (Manitoba), Rabbit Lake SK, Canada | `https://api.phys.ucalgary.ca/api/v1/rt/trexrgb_{gill,pina,rabb}_standard/latest` | Night: ~3–10 s frames (network norm); at check dawn-frozen (Gillam last frame 09:45 UTC) | ✅ 200 both | Academic research network; no license page; credit "UCalgary Auroral Imaging Group / TREx" | API returns `image/jpeg` + header `x-rt-stream-last-updated-utc` (**no CORS → client cannot read freshness**). Night-gated: frozen at dawn, resumes at sunset — same staleness-badge problem as other night cams |
| 5 | **UCalgary SMILE ASI — Kapuskasing / Rankin Inlet** (same group) | Kapuskasing ON, Rankin Inlet NU (Nunavut), Canada | `https://api.phys.ucalgary.ca/api/v1/rt/smileasi_{kapu,rank}_standard/latest` | Same as #4 (Rankin last frame 08:46 UTC at check) | ✅ 200 both | Same | Same API pattern; same-pattern endpoints also exist for Lucknow ON, Taloyoak NU, Sacheen BC (not freshness-verified) |
| 6 | **UCalgary campus all-sky** (same group) | Calgary, AB, Canada (51°N) | `https://cam01.sci.ucalgary.ca/AllSkyCam/AllSkyCurrentImage.JPG` | 1–2 min (14:34→14:36 UTC, daylight) | ✅ 200 both | Same | Lower aurora value (51°N) but 24/7 sky cam |
| 7 | **NPS Isle Royale — Northshore cam** (US National Park Service) | Isle Royale NP, Michigan, USA | `https://www.nps.gov/webcams-isro/northshore.jpg` | ~5 min (14:15→14:21 UTC) | ✅ 200 both | US federal government → public domain; credit NPS | Lake Superior shore sky cam; aurora on KP5+ storms; part of NPS webcam system (sibling cams via nps.gov/media/webcam/view.htm?id=…) |
| 8 | **Panomax — Nordkapp (cam 5067) / Loen (cam 1941)** (Panomax GmbH) | Nordkapp, Finnmark & Loen, Vestland, Norway | `https://live-image.panomax.com/cams/{5067,1941}/recent_reduced.jpg` | 2–6 min (14:18→14:24 UTC) | ✅ 200 both | Panomax standard terms: free for private/non-commercial use with credit; commercial use needs license (per panomax.com terms) | Nordkapp = 71°N aurora-prime. `recent_reduced` is the embeddable reduced-res frame |
| 9 | **yr.no legacy direct images** (MET Norway) | Setermoen, Brekke/Orneset, Finnsnes, Skjervøy, Risøyhamn, Norway | `https://www.yr.no/webcams/1/2000/{setermoen,ortneset,finnsnes,skjervoy,risoyhamn}/{n}.jpg` | ~10–15 min | ✅ 200 both | None found on live files (orphaned URLs) | Correction per §6.1. Landscape cams (not all-sky) but live & HTTPS |
| 10 | **AllSkyCam community — Hope, NJ (user 627)** | Hope, New Jersey, USA | `https://www.allskycam.com/u/627/latest_full.jpg` | ~5 min (14:18→14:23 UTC) | ✅ 200 both | AllSkyCam.com community network; free use with credit (site is a hobby network) | Amateur allsky; aurora on KP6+ |
| 11 | **linuxkidd all-sky** | Mayhill, New Mexico, USA | `https://allsky.linuxkidd.com/image-fullsize.jpg` | 1–2 min | ✅ 200 both | Personal site; no license text; credit "allsky.linuxkidd.com" | Amateur allsky, aurora on KP7+ |
| 12 | **Starvisor — Kaliningrad (cap_klnsky)** (Starvisor, RU) | Kaliningrad, Russia (54.7°N) | `https://starvisor.ru/wp-content/uploads/webcam/cap_klnsky.jpg` | ~1 min (14:21→14:22 UTC) | ✅ 200 both | Russian night-sky patrol project; no EN license text; credit starvisor.ru | Only live Russian cam found, but 54°N = aurora only on extreme storms. Sibling feeds (Murmansk `cap_mur`, St. Petersburg `cap_spbd`, Strezhevoy `capture_str`) all frozen since 2025-07-07. Site has a live aurora map (starvisor.net) |
| 13 | **Graham's AllSky** (private) | Wellington, New Zealand (41°S) | `http://grahamsallsky.zapto.org/allsky/image.jpg` | ~1 min (14:31 UTC fresh) | ✅ 200 both | Personal allsky; no license text | **HTTP only** (zapto.org dyndns) → breaks on HTTPS SPA via mixed-content (same trap as NIPR). Dynamic-DNS host = URL stability risk |
| 14 | **Foto-webcam.eu — Ettelsberg** | Ettelsberg, Germany (51°N) | `https://www.foto-webcam.eu/webcam/ettelsberg/current/1920.jpg` | sub-10-min (observed 14:20, stable across 4 min) | ✅ 200 both | foto-webcam.eu community; free with credit | Not aurora-grade; included for completeness (SWL lists it) |

### 6.3 SpaceWeatherLive sweep — full classification

Source: `https://www.spaceweatherlive.com/en/auroral-activity/webcams.html` (200, fetched raw; every entry listed below). Legend: **STILL-LIVE** = verified embeddable fresh `<img>`; **STILL-NIGHT** = embeddable but dark-gated (frozen in daylight); **STILL-STALE** = embeddable, currently frozen/seasonal; **VIDEO** = YouTube live stream; **PLAYER** = requires the operator's JS player/iframe page; **DEAD** = 404/zombie.

| Entry (as listed by SWL) | Region | URL | Class |
|---|---|---|---|
| KHO, Svalbard | Svalbard, NO | `kho.unis.no/Quicklooks/kho_sony.jpg` | STILL-STALE (2026-03-26 — polar night ended) |
| Nordkapp, Finnmark | Nordkapp, NO | panomax cams/5067 | **STILL-LIVE** |
| Skibotn, Troms | Skibotn, NO | fox.phys.uit.no ASC01 | STILL-LIVE (already in §1) |
| Setermoen (NE cam) | Troms, NO | yr.no …/setermoen/3.jpg | **STILL-LIVE** |
| Loen, Vestland | Loen, NO | panomax cams/1941 | **STILL-LIVE** |
| Brekke (W + NE cams — duplicate URL) | Vestland, NO | yr.no …/ortneset/1.jpg | **STILL-LIVE** |
| Abisko by LightsOverLapland | Abisko, SE | lightsoverlapland.com/aurora-webcam/ | PLAYER (Cloudflare-blocked; Twitch video) |
| Abisko by Fabian Wimmer | Abisko, SE | fabianwimmer.com/…allsky… | PLAYER (page 200; no plain still in HTML; video embed) |
| Kiruna | Kiruna, SE | irf.se/alis/allsky/krn/latest_medium.jpeg | STILL-STALE (01:51 UTC — see §1) |
| Porjus (North) | Porjus, SE | uk.jokkmokk.jp/photo/nr4/latest.jpg | **STILL-LIVE** |
| Porjus (West) | Porjus, SE | uk.jokkmokk.jp/photo/nr3/latest.jpg | **STILL-LIVE** |
| Kilpisjärvi (North) | Kilpisjärvi, FI | youtube ccTVAhJU5lg | VIDEO |
| Levi | Levi, FI | youtube rKfecmmzzw0 | VIDEO |
| Sodankylä | Sodankylä, FI | sgo.fi/Data/RealTime/Kuvat/UCL.jpg | STILL-NIGHT (frozen 00:58 UTC daytime at check) |
| Posio | Posio, FI | youtube iOmco6eIa-0 | VIDEO |
| Hankasalmi | Hankasalmi, FI | aurorasnow.fmi.fi latest_SIR_AllSky | **STILL-LIVE** |
| Nyrölä | Nyrölä, FI | aurorasnow.fmi.fi latest_SIR | **STILL-LIVE** |
| Kirkkonummi | Kirkkonummi, FI | aurorasnow.fmi.fi latest_HOV | **STILL-LIVE** |
| Helsinki | Helsinki, FI | space.fmi.fi/MIRACLE/RWC/latest_HEL.jpg | STILL-STALE (2026-05-29 seasonal) |
| Syrjävaara Dark Sky Park | Kaavi, FI | syrjavaara.fi/img/syrjavaara_latest_img.jpg | STILL-NIGHT (frozen 02:11 UTC) |
| Highland Center Hrauneyjar | Iceland | thehighlandcenter.is/northern-lights/webcam | **DEAD (404)** |
| Hella Landhotel | Iceland | landhotel.is/index.php/northernlights-live | PLAYER (video page) |
| Aðaldalshraun | Iceland | netnurds.com | PLAYER (video page) |
| Sorø | Sorø, DK | archive.allsky.tv/AMS89/LATEST/010893.jpg | STILL-STALE (2026-01-14 — zombie) |
| Ilulissat Airport | Greenland | youtube nT9QtAbaLg4 | VIDEO |
| Tasiilaq Heliport | Greenland | youtube hfF9bhaBuvw | VIDEO |
| Teriberka, Murmansk Oblast | Murmansk, RU | video.auroracam.ru/page/mmeWvVgS | VIDEO (Boomstream player; poster image static since 2026-01-16) |
| Strezhevoy, Tomsk | Strezhevoy, RU | starvisor.ru …/capture_str.jpg | STILL-STALE (2025-07-07 zombie) |
| St. Petersburg | SPb, RU | starvisor.ru …/cap_spbd.jpg | STILL-STALE (2025-07-07 zombie) |
| Kaliningrad | Kaliningrad, RU | starvisor.ru …/cap_klnsky.jpg | **STILL-LIVE** (54°N, not aurora-grade) |
| Shetland Islands | Shetland, UK | shetlandwebcams.com/cliff-cam-3/ | PLAYER (video; also eshaness-lighthouse cam, video) |
| Cape Arkona (Vitt + Peilturm) | Rügen, DE | kap-arkona.panomax.com/… | PLAYER (Panomax viewer) |
| Ettelsberg | Ettelsberg, DE | foto-webcam.eu …/ettelsberg/current/1920.jpg | STILL-LIVE |
| Brno 1–4 | Brno, CZ | youtube ×4 | VIDEO |
| Pizzo Matro | Ticino, CH | pizzomatro.roundshot.com | PLAYER (Roundshot viewer) |
| Yellowknife (AuroraMAX) | Yellowknife, CA | auroramax.phys.ucalgary.ca recent_480p | **STILL-LIVE** |
| Churchill | Churchill, MB, CA | youtube a0i1Kg6fROg | VIDEO |
| Banff | Banff, AB, CA | youtube _YomWp1APOk | VIDEO |
| Chatanika, Alaska | AK, US | allsky.gi.alaska.edu (UAF) | PLAYER/link (UAF — see §1 SSE approach) |
| Fairbanks by TheAuroraChasers | AK, US | theaurorachasers.com/aurorawebcam | **DEAD (404)** |
| Fairbanks | AK, US | youtube k7S5IkS_FTA | VIDEO |
| Isle Royale NP | MI, US | nps.gov/webcams-isro/northshore.jpg | **STILL-LIVE** |
| Sebec Lake | ME, US | neoc.com/webcam3/ | PLAYER |
| Hope, New Jersey | NJ, US | allskycam.com/u/627/latest_full.jpg | **STILL-LIVE** |
| Mayhill, New Mexico | NM, US | allsky.linuxkidd.com/image-fullsize.jpg | **STILL-LIVE** |
| Kingston, Tasmania | Kingston, TAS, AU | allskycam.com/u.php?u=539 | STILL-STALE (image frozen 2025-11-26) |
| Craigie, WA | Craigie, AU | allskycam.com/u/606/latest_full.jpg | **DEAD (404)** |
| Sydney, NSW | Sydney, AU | admin.meteobridge.com/cam/9c25…/camplus.jpg | **DEAD (301)** |
| Davis Station | Antarctica | antarctica.gov.au/…/webcams/davis/ | PLAYER (page; images use timestamped filenames `D2608291430s.jpg` — churn) |

**SWL page verdict:** 13 entries are directly embeddable `<img>` sources (incl. the seasonal/night-gated ones), 11 are YouTube videos, ~10 are operator-player pages, 5 are dead links. The page itself is a good **external resource link** for the app.

### 6.4 Lights over Lapland + Twitch embed verdict

- **Site still Cloudflare-blocked** for non-JS clients: 403 on `/aurora-webcam/` and on `/` even with a full browser header set (Accept, Accept-Language, Sec-CH-UA, Sec-Fetch-*, Upgrade-Insecure-Requests); a guess at `wp-content/uploads/…/webcam.jpg` → 404. No still-image URL could be located from outside the challenge. Their stream is on **Twitch: `twitch.tv/lightsoverlaplandlive`** (confirmed via search; Twitch channel page exists).
- **Twitch embed verdict (per dev.twitch.tv/docs/embed, fetched live):** iframe embedding of the stream **is allowed**. Requirements: your page must be HTTPS; `parent=<your-domain>` is **required** in the player URL (one `parent` per domain, else the player shows a playback error); iframe min 400×300; `allowfullscreen` attribute; optional `autoplay=true` (default true) and `muted=true` (browsers block unmuted autoplay without user gesture — set muted for auto-start). Working pattern: `<iframe src="https://player.twitch.tv/?channel=lightsoverlaplandlive&parent=myapp.example.com&muted=true" height="360" width="640" allowfullscreen>`. Embeds must not be obscured, and comply with the Twitch Developer Services Agreement (Twitch can revoke per-domain). **Data note:** a Twitch stream is heavy (multi-Mbps); the app's "still image + external *watch live* link" preference is the right call — link to `https://www.twitch.tv/lightsoverlaplandlive` rather than embedding.

### 6.5 EarthCam mapsearch verdict

`https://www.earthcam.com/mapsearch/` loads (200, 65 KB; meta: *"Use our interactive map to find a webcam location in your area, or anywhere in the world"*). It is a public, browsable worldwide webcam directory/map. **A plain external link needs no permission** (standard linking; no anti-hotlink/terms issues for a link). Embedding *their* cam feeds would require their embed codes/terms, but we only link. Caveat: EarthCam's own network is city/construction cams — not aurora — so link it as a "more webcams" resource, not a sky-cam source.

### 6.6 Geography hunt (Canada / NZ–Tasmania / Russia / UK / Iceland)

- **Canada — strong.** Verified live: AuroraMAX (Yellowknife, NWT), TREx RGB Gillam MB + Pinawa MB + Rabbit Lake SK, SMILE ASI Kapuskasing ON + Rankin Inlet **NU**, UCalgary campus AB (all UCalgary Auroral Imaging; API pattern in §6.2). Conditional: **Rampart House, Yukon** (`https://pano.montiscorp.com/images/rampart.jpg` — montiscorp panocam; all their cams incl. Kaktovik/Poker Flat/Port Graham frozen at 2026-08-24, suspicious shared timestamp — re-check). Dead: UManitoba Glenlea allsky (2021), explore.org Churchill (video), AuroraMAX CSA page (301 — see §6.1).
- **NZ/Tasmania — thin.** Live: Graham's AllSky Wellington (`http://grahamsallsky.zapto.org/allsky/image.jpg`, HTTP-only → mixed-content trap). Dead/blocked: UCanterbury `LatestImage.jpg` (no connection), Dunedin Aurora (dunedinaurora.nz — JS dashboard, no plain still found), allskycam Kingston TAS (frozen 2025-11), Hobart City webcams platform (HTTP 500), meteobridge Sydney (301). Other: Airservices Australia airport weathercams live (`weathercams.airservicesaustralia.com`, gov, `014015_180.jpg` fresh 10-min; airport identity unconfirmed from this location), AAD Davis (Antarctica, timestamped filenames — churn). No aurora-australis-grade still cam verified.
- **Russia — effectively zero aurora-grade.** Live: only starvisor Kaliningrad (54°N). Dead feeds: starvisor Murmansk (69°N! `cap_mur.jpg` frozen 2025-07-07), St. Petersburg, Strezhevoy. Teriberka (69°N) = Boomstream video with static poster. PGI Apatity (aurora.pgia.ru) = research archive, no public plain feed (realtime page links only weather/waves). Norilsk/Yakutsk appear only on player aggregators (Skyline, CamGuide). Language barrier: site text is Russian; no EN terms found. **Verdict: no verified Russian aurora still cam — mark region uncovered.**
- **UK:** Shetland Webcams remain video-only (cliff-cam-3 + eshaness-lighthouse both players). No new UK still cam found.
- **Iceland:** vedur.is webcam server still unreachable from this network (302 → `http://193.4.200.58` timeout, `v1.myndir.vedur.is` DNS dead — unchanged from morning). SWL's Icelandic entries: Highland Center 404, Landhotel + netnurds video pages. **No verified Icelandic still cam.**

### 6.7 Region coverage (verified embeddable stills, incl. §1 shortlist)

| Region | Verified embeddable cams | Notes |
|---|---|---|
| Scandinavia (NO/SE/FI) | ~17 | Jokkmokk ×4, UEC Tromsø AI ×4, TGO Skibotn ×2, yr.no ×5, Panomax ×2, FMI aurorasnow ×3, SGO UCL (night), IRF Kiruna (stale), FMI MIRACLE (seasonal) |
| Alaska (US) | 1 (UAF Poker Flat) + conditional montiscorp | UAF needs SSE resolution; montiscorp frozen since 08-24 |
| Canada | 7 | AuroraMAX, TREx ×3, SMILE ×2, UCalgary campus; + conditional Rampart House YT |
| US (contiguous) | 3 | NPS Isle Royale, AllSkyCam Hope NJ, linuxkidd Mayhill |
| NZ / Tasmania | 1 (HTTP-only, Wellington) | No aurora-australis-grade cam verified |
| Russia | 0 aurora-grade | Only Kaliningrad (54°N) |
| UK | 0 | Shetland video-only |
| Iceland | 0 | vedur.is unreachable; hotels video-only |
| Antarctica (bonus) | 0 stable | AAD Davis images use timestamped filenames |

### 6.8 New dead/zombie evidence (afternoon)

`theaurorachasers.com/aurorawebcam` 404 · `thehighlandcenter.is/northern-lights/webcam` 404 · `allskycam.com/u/606` 404 · meteobridge Sydney 301 · `allsky.tv/AMS89` zombie (2026-01) · starvisor mur/spbd/str zombies (2025-07) · `allsky.physics.umanitoba.ca/outdoor.png` (2021) · `www2.phys.canterbury.ac.nz/~physweb/LatestImage.jpg` no connection · `hccapps.hobartcity.com.au/webcams/platform` HTTP 500 · KHO `kho_sony.jpg` seasonal (2026-03) · `space.fmi.fi/MIRACLE/RWC/latest_HEL.jpg` seasonal (2026-05) · `montiscorp.com` all cams frozen 2026-08-24 (shared timestamp — likely camera-side outage) · `sgo.fi …/UCL.jpg` + `syrjavaara.fi` night-gated (frozen in daylight — not dead). Lights over Lapland still Cloudflare-403 (root + page + guessed wp-content paths) even with full browser headers.

---

## Appendix: verification log (2026-08-29 UTC)

All with `User-Agent: Mozilla/5.0 … Chrome/126.0`; hotlink probe added `Referer: https://myapp.example.com/webcams`.

- `https://www.irf.se/alis/allsky/krn/latest_medium.jpeg?noforevercache` — 200, image/jpeg, 512 398 B, Last-Modified 01:51:01 UTC (unchanged across 70 s — **stale**); `latest.jpeg` 3 884 940 B; `latest_nkeogram.gif?noforevercache` 95 844 B. Page: https://www2.irf.se/Observatory/?link=All-sky_sp_camera ("refreshes automatically every minute"). License: https://www.irf.se/en/forskning/kago/license/ (non-profit free; commercial/media = permission).
- `https://tromsoe-ai.cei.uec.ac.jp/~nanjo/public/aurora_alert/latest.jpg` — 200, image/jpeg, 18 053 B, Last-Modified 13:54:05 → 14:02:04 UTC during test (live, ~min–8 min cadence); `latest_abisko.jpg` 38 375 B (13:53:39); `latest_kiruna.jpg` 164 924 B (01:51:36); `latest_skibotn.jpg` 40 246 B (07:59:34); `latest_keo.png` 99 613 B (2026-04-17 — seasonal). URLs discovered in `https://tromsoe-ai.cei.uec.ac.jp/js/app.85ae434b.js`.
- `https://fox.phys.uit.no/ASC/Latest_ASC01.png` — 200, image/png, 27 942 B, Last-Modified 13:55:12 (daylight-frozen at test); `BACC5.jpg` 188 120 B (13:54:19); `BACC5_keo.jpg` 49 397 B. HTTPS works. Iframe pages `ASC01_img1.html`, `BACC5_img.html` (`meta refresh 15`).
- `https://allsky.gi.alaska.edu/src/checkLive.php?cam=poker-flat` — 200, `text/event-stream`, **`Access-Control-Allow-Origin: *`**, `retry: 10000`; frame `PKR/tagged_cam/PKR_260829140029.jpg` 129 338 B (200, image/jpeg) — last frame 14:00:29 UTC, ~2 h old at test (daylight gate). Directory listing `https://allsky.gi.alaska.edu/PKR/tagged_cam/` shows ~5–15 s frame spacing (89–124 KB) during night runs. `cam=toolik-lake` → `images/toolik-notdark.jpg`; `cam=gakona` → `images/coming-soon.jpg`. Referenced from https://www.gi.alaska.edu/monitors/aurora-forecast.
- `http://esr.nipr.ac.jp/www/optical/watec/skb/rt/wat_skb_rt1.jpg` — 200, image/jpeg, 18 769 B, Last-Modified 13:57:25 → 13:58:25 (live, 1/min). HTTPS: `https://esr.nipr.ac.jp/…` → 000 (no TLS, tls1.2 also fails). Network page: http://pc115.seg20.nipr.ac.jp/www/opt/realtime.html. Stale siblings: `TRO/wat_tro_rt1.jpg` (2026-04-15), `lyr/…wat_lyr_rt10.jpg` (2026-04-06), `SOD/wat_sod_rt.jpg` (2026-04-14), `polaris…/KRN/wat_krn_rt.jpg` (2025-09-17), `KIL/wat_kil_rt1.jpg` (2026-08-20).
- `https://space.fmi.fi/MIRACLE/ASC/ASC_keograms/tmp_MUO_keo/Allsky_MUONIO.jpg` — 200, image/jpeg, 179 591 B, Last-Modified 2026-05-29; `tmp_KEV_keo/Allsky_KEVO.jpg` same date. Discovered via TGO BACC iframes (BACC3/BACC4). Policy: https://space.fmi.fi/MIRACLE/ASC/index.php?page=rules%20of%20road.
- `https://kho.unis.no/Quicklooks/ZWO/Allsky.jpg` — 200 (HTTPS works), Last-Modified 2026-03-24. BACC1 iframe source.
- 404/301/dead: `aurorawatch.lancs.ac.uk/webcams/` 404; AWUK `js/map.js` cameras = 2 placeholders; `www.yr.no/en/webcams` 404; `api.met.no/weatherapi/webcams/1.0/` 404; `asc-csa.gc.ca/eng/astronomy/auroramax/` 301; `softservenews.com/webcams.html` 404 (sitemap: no cam pages); `lightsoverlapland.com/aurora-webcam/` 403 Cloudflare; `taivaanvahti.fi/cameras` Anubis PoW; `vedur.is/myndir/` → 193.4.200.58 timeout; `v1.myndir.vedur.is` DNS dead; `fox.phys.uit.no/robots.txt` 404; `irf.se/robots.txt` present (no disallow); `allsky.gi.alaska.edu/robots.txt` absent (SPA fallback); `wave.info.hiroshima-cu.ac.jp/obs/abisko/data/` 404; `ans.kiruna.se` timeout; `www.sgo.fi` alive but no public realtime camera image found (realTime.php renders no cam frames).

---

## Sources

- IRF Kiruna all-sky: page https://www2.irf.se/Observatory/?link=All-sky_sp_camera · about https://www.irf.se/en/observatory-activities/allsky-camera/ · license https://www.irf.se/en/forskning/kago/license/ · app https://www.irf.se/en/om-irf/ar-det-norrsken-i-kiruna/
- Tromsø AI (UEC): https://tromsoe-ai.cei.uec.ac.jp/ (+ `js/app.85ae434b.js`) — referenced from TGO optical page
- TGO: https://www.tgo.uit.no/ · https://fox.phys.uit.no/ASC/ (+ ASC01/BACC iframes)
- UAF Allsky: https://allsky.gi.alaska.edu/ (+ `js/cameraControl.js`, `src/checkLive.php`) · https://www.gi.alaska.edu/monitors/aurora-forecast
- NIPR optical network: http://pc115.seg20.nipr.ac.jp/www/opt/realtime.html
- FMI MIRACLE ASC: https://space.fmi.fi/MIRACLE/ASC/ (+ `?page=rules of road`)
- KHO: https://kho.unis.no/instruments/AllskyNCU.html
- AuroraWatch UK: https://aurorawatch.lancs.ac.uk/ · map JS `/js/map.js` · embedding policy https://aurorawatch.lancs.ac.uk/faq/linking/ · Shetland recommendation https://wp.lancs.ac.uk/aurorawatchuk/2018/04/19/watch-uk-aurora-live-from-the-comfort-of-your-own-home/
- Shetland Webcams: https://www.shetlandwebcams.com/cliff-cam-3/ (video; Terms & Conditions linked from site footer)
- Local: ADR-0001 (`docs/adr/0001-client-side-only-architecture.md`), prior research `docs/research/aurora-chaser-features-2026-08-25.md` (AWUK cliff cam, yr.no, aurora-service.eu mentions)

### Sweep #2 sources (added afternoon)

- Jokkmokk: https://uk.jokkmokk.jp/ (HTML embeds `photo/nr{1..5}/latest_m.jpg`, `photo/nra/latest_m.jpg`)
- IRF re-check: https://www2.irf.se/Observatory/?link=All-sky_sp_camera ("sony α7s", refresh 60 s; license PDF https://www.irf.se/wp-content/uploads/2020/02/licensavtal.pdf)
- Lights over Lapland: https://lightsoverlapland.com/aurora-webcam/ (403 CF) · Twitch channel https://www.twitch.tv/lightsoverlaplandlive · Twitch embed policy https://dev.twitch.tv/docs/embed/ + https://dev.twitch.tv/docs/embed/video-and-clips/ (fetched live: HTTPS + `parent` required, min 400×300, autoplay/muted params)
- SpaceWeatherLive webcams page: https://www.spaceweatherlive.com/en/auroral-activity/webcams.html (raw HTML parsed — all 54 entries listed in §6.3)
- FMI aurorasnow: https://aurorasnow.fmi.fi/public_service/images/ (Hankasalmi/Nyrölä/Kirkkonummi)
- UCalgary Auroral Imaging: https://api.phys.ucalgary.ca/api/v1/rt/{trexrgb_gill,trexrgb_pina,trexrgb_rabb,smileasi_kapu,smileasi_rank}_standard/latest · https://cam01.sci.ucalgary.ca/AllSkyCam/AllSkyCurrentImage.JPG · https://aurora.phys.ucalgary.ca/ucimage/live.html (2014 placeholder) · AuroraMAX https://auroramax.com/ (+ JS bundle `static/js/main.07724260.js` → 3 s refresh, credit line) · https://auroramax.phys.ucalgary.ca/recent/recent_{480p,720p,1080p}.jpg
- The Aurora Guy webcam directory (secondary, used only to *discover* primary URLs): https://theauroraguy.com/pages/webcams
- NPS: https://www.nps.gov/webcams-isro/northshore.jpg · Panomax: https://live-image.panomax.com/cams/5067/recent_reduced.jpg · yr.no legacy: https://www.yr.no/webcams/1/2000/{setermoen,ortneset,finnsnes,skjervoy,risoyhamn}/{n}.jpg · Starvisor: https://starvisor.ru/wp-content/uploads/webcam/cap_klnsky.jpg (+ mur/spbd/str zombies) · AllSkyCam: https://www.allskycam.com/u/627/latest_full.jpg · linuxkidd: https://allsky.linuxkidd.com/image-fullsize.jpg · Graham's AllSky: http://grahamsallsky.zapto.org/allsky/image.jpg (Wellington NZ) · foto-webcam.eu: https://www.foto-webcam.eu/webcam/ettelsberg/current/1920.jpg · EarthCam: https://www.earthcam.com/mapsearch/
- Russia: https://aurora.pgia.ru/realtime.html (PGI archive) · https://video.auroracam.ru/page/mmeWvVgS (Boomstream poster `bs.boomstream.com/balancer/size:480/0XYArL7Y-a1.jpg` static since 2026-01-16) · starvisor Murmansk page https://starvisor.ru/mur/

---

*Compiled 2026-08-29 from live primary-source HTTP checks (two sweeps: morning + afternoon). Re-verify before implementation: camera feeds are seasonal, unversioned, and several top candidates (IRF Kiruna, UAF Poker Flat, UCalgary TREx/SMILE, AuroraMAX) were in daylight-frozen or seasonal-start state at check time.*