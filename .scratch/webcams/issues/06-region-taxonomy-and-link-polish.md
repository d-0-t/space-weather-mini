# 06: Region taxonomy rework + link-row polish

**What to build:** Re-group the gallery into Nordic / Alaska / North America / UK / Russia / Other regions, flip the filter dialog's Show/Hide all into Select/Deselect all, give link rows country flags (group-level for uniform countries, per-row for mixed ones), carry the country in link metadata, and fix/trim the link registry (dead links removed, broken URLs fixed, noise notes dropped).

**Blocked by:** 05

**Status:** done

- [x] Region taxonomy renamed and merged: Scandinavia → **Nordic** (absorbing the Iceland and Greenland link rows; Finland is not Scandinavia), Canada + US → **North America**, Antarctica + New Zealand links move to **Other regions** (`rest`); the closed region set is now Nordic, Alaska, North America, Australia, UK, Russia, rest
- [x] Filter dialog: **Select all** checks every draft box, **Deselect all** unchecks every box (renamed + reversed from Show all / Hide all by user decision); the hidden-sources dialog's restore "Show all" is untouched
- [x] Link rows carry a `country` field; uniform-country groups (UK, Russia) show one flag on the group heading, mixed groups (Nordic, North America, Other regions) show a flag per row (flagcdn, new codes for gb/gl/is/ch/de/nz/aq)
- [x] Link metadata reads "{Country} · {operator}" (was the region name); missing place names added (Graham's AllSky – Wellington, Murmansk – Teriberka aurora cam)
- [x] Links fixed: Fabian Wimmer → abisko webcam page; Posio → new YT id; AAD → "Casey, Davis, Macquarie Island, Mawson" at antarctica.gov.au/antarctic-operations/webcams/
- [x] Dead links removed: Banff (Canada YT), Fairbanks (US YT)
- [x] Noise notes removed from the live UI: Boomstream video player, Shetland HLS notes (×2), Fabian Wimmer site-player note, AAD timestamped-filenames note
- [x] Typecheck, build and the unit suite are green (378 passed)

## Comments

Implemented 2026-08-29. Decisions:

- **"North America" is the merged Canada/US section name** (Alaska stays its own region – the UAF live cam); image cards already carry per-card country flags, the merge is purely the section grouping.
- **Group flag vs per-row flag rule**: `rows.every(country === rows[0].country)` – uniform → one flag on the group h3 (UK, Russia, and the fixture's single-row Nordic group); mixed → a flag before each row name (real Nordic is mixed: se/fi/no/gl/is; North America: ca/us; Other regions: nz/aq/ch/de).
- **Link metadata now shows the country** ("New Zealand · Tasman Cams") so place+country are visible even in mixed groups; the region is implied by the section.
- **Svalbard**: no verified entries exist yet – the Nordic rename reserves the group for them (per the user's "include Iceland, Svalbard and Greenland").
- The filter persistence contract (versioned regions array) is unchanged – only the region vocabulary moved; stale stored values like "Scandinavia"/"Canada" now fall through the known-region filter to nothing (existing fallback behavior).
- The hidden-sources dialog keeps its own **Show all** (restore-all semantics) – only the filter dialog's buttons were renamed.
- Contract tests extended: every link entry now requires a non-empty country with a flagcdn code; region-presence pins updated to Nordic/North America/Russia (images) and UK/rest/Nordic (links).