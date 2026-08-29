# 07: Collapsible regions + media-in-region + link row cleanup

**What to build:** Reuse the home dashboard's CollapsiblePanel so every webcam region collapses; place the Twitch stream and the live cam inside their regions (Lights over Lapland → Nordic, UAF Poker Flat → North America); drop link-row notes and Hide buttons; gold moon icon; slightly toned-down default text color.

**Blocked by:** 06

**Status:** done

- [x] `CollapsiblePanel` moved from `home/components/CollapsiblePanel` to the shared `src/components/CollapsiblePanel` (home imports updated); every region section and the Webcam links section render inside it (open by default, chevron + aria-expanded, Jump to top as the adornment)
- [x] The Twitch stream card (Lights over Lapland, Abisko Sweden) renders inside the Nordic region after its image cards – its standalone section and jump pill are gone
- [x] The UAF live cam card renders inside the North America section; its registry region is now `North America` (Alaska is unused as a region)
- [x] Regions stay alive while any of their media is visible: a section renders when it has image cards OR the live cam OR the Twitch card, so hiding every image card of a region doesn't silently drop its live cam
- [x] All `webcam-link-row__note` elements removed: the `note` field left `WebcamLinkEntry` and the last five notes (Video page ×2, Site player, Roundshot viewer, Panomax viewer) left the registry
- [x] Hide buttons removed from link rows (hiding stays for image/live/Twitch cards; already-hidden link ids stay inert in storage and restore fine)
- [x] Astro mode moon icon is moon-yellow (`--color-gold`); `--color-text-primary` is `#f0f0f0` – a slight tone-down from pure white (~19:1 on black, still WCAG AAA)
- [x] Typecheck, build and the unit suite are green (379 passed)

## Comments

Implemented 2026-08-29. Decisions:

- **`mediaByRegion`** replaces the image-cards-only section loop: one map over `WEBCAM_REGION_ORDER` holding each region's image cards, live card and Twitch card; jump pills and sections both derive from it. This also fixed a real bug the merge would have introduced – with sections driven by image cards alone, hiding every image card in North America would have removed the live cam's home.
- **The Twitch card** keeps its own `WebcamTwitchCard` component (parent param, no autoplay, hide button) – only its placement changed.
- **Link rows** are now non-interactive gallery entries (no hide, no notes); the Hidden sources dialog still lists and restores any link ids hidden before this change (storage is untouched).
- **CollapsiblePanel reuse**: the component's API (heading/adornment/bodyId) fit the region sections without changes; the Jump to top link rides as the adornment so clicking it never collapses the panel.
- The empty-state test now exercises North America (three image cards + the live cam) since links can no longer be hidden; the Select/Deselect test hides a non-asserted card.

### Follow-up (2026-08-29, same session): grid spans + row-count fix

- **The Twitch and live cards render inside the region's cards grid** (user moved them in). Spans: the Twitch card is always **two card columns wide** (`webcam-card--wide` on the stream card); the live cam is **one column while idle and two while the feed is active** (the `webcam-card--wide` class is added when `feeding`). `width: fit-content` left both cards – as grid items they stretch to their spans; the iframe still caps at `max-width: 100%`.
- **The "3 items per row" regression was a pre-existing shrink-wrap bug the move exposed**: `.container` is a flex item of `#main-content`, so it shrink-wrapped to its content (~818px at a 1280px viewport) and the `auto-fill` grid counted tracks against that shrunken width. `.container.webcams` now sets `width: 100%` (capped by `max-width: 1200px`), restoring 5 columns at 1280px (measured with a throwaway Playwright probe: 5×221px cards, panoramic full-row 1168px, twitch 458px = 2 columns).