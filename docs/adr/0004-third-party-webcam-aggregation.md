# 0004: Third-party webcam aggregation (embed-only, attributed, curated)

The app is a client-side-only display (ADR-0001) of NOAA SWPC products plus a few external images (OVATION JPGs, Kiruna magnetogram). Aurora chasers want live sky cameras, but the app will never run its own hardware. We will aggregate third-party webcams on a `/webcams` page: **embed operator-served images only** (plain `<img>` on the operator's URL — never scrape, host, or proxy), **one gallery item per source**, **attribute the operator on every card**, and **curate a fixed verified set** (per `docs/research/webcam-sources-2026-08-29.md`, verified live 2026-08-29) rather than accept submissions. Only sources whose operator permits embedding are included; where no license text exists the source is still embedded with visible attribution and flagged in the config as the risk member. Freshness is honest by construction: browsers cannot read image timestamps without CORS, so cards show "Loaded HH:MM · operator refreshes every N min" instead of a fabricated age. Automatic refreshing exists but is **opt-in** (`sw:webcams:autorefresh:v1`, default off, honest data-use copy) and pauses when the tab is hidden, mirroring ADR-0003's battery discipline; the one true-live cam (UAF Poker Flat) follows its CORS-open SSE feed. Video-only or unembeddable sources (YouTube/Twitch streams, HTTP-only stills) appear as link rows after the image cards. Per-source hiding (any source type) persists in `localStorage["sw:webcams:hidden:v1"]`.

**Status**: accepted

**Considered Options**:

- Own hardware / hosted cameras — ops cost, ADR-0001 violation, and the app's job is display, not capture.
- User-submitted links — needs moderation and review, and the page's promise is "every pixel verified".
- Uncurated directory — becomes a graveyard of 403s and dead streams.
- Video-first cards — heavy bandwidth; contradicts the chaser-on-flaky-signal audience; Twitch is embedded only for Lights over Lapland with `autoplay=false`.
- Fabricated "updated X ago" labels — rejected; CORS makes true timestamps unreadable, and the app's freshness honesty is a product choice (see the wontfixed where-am-I distance pill).

**Consequences**:

- `src/data/webcams.ts` is the single source of truth: entry shape (id, name, region, latitude, operator, imageUrl, cadence, `refreshable`, license, note) plus link entries. A cam that dies or changes license is removed from the config, not the code.
- The Twitch embed needs a `parent` param per deploy target (localhost, Netlify, gh-pages); the config records the channel, the component builds the player URL.
- ADR-0003's polling rules apply by analogy to auto-refresh: pause on hidden tab, never poll faster than the operator's own cadence.
- Alt text, operator credit, and license notes are part of every card — WCAG 2.1 AA and attribution are not optional chrome.