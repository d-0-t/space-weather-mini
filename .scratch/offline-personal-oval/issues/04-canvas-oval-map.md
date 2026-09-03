# 04: Canvas oval map (default palette)

**What to build:** A `<canvas>` oval on Home that paints the real OVATION grid over a few Stadia dark tiles, with `North | South` toggle and `Forecast Time`.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Fetch `ovation_aurora_latest.json` via TanStack Query `live:true` 5 min polling, `refetchIntervalInBackground:false`; decimate 1° grid, equirectangular project to `<canvas>` over Stadia `alidade_smooth_dark` tiles (locked `minZoom 1` / `maxZoom 2`, horizontal wrap, ~4 tiles north + 4 south, `CacheFirst` 7 days, attribution `© Stadia Maps © OpenMapTiles © OpenStreetMap`, no geocoding/routing)
- [ ] `Aurora 0` transparent, `1-5/6-10/11-15/16+` mapped to frozen Kp palette via `color-mix` (no new hex), default shows colour wash only (no hatch, clean), `North | South` toggle drives which grid is painted
- [ ] Header shows `Forecast Time` (not `Observation Time`) with `30–90 min lead` and `As of • Updated {age}` plus `⚠` stale branch; hemispheric power GW headline kept
- [ ] A11y: canvas `role="img"` `aria-label` lists bands, hidden `<table>` is source of truth per coding standards, legend row shows swatch per band (no numbers on map), focus on toggle visible in Light Lime per ADR-0002
- [ ] Component test: mocks Stadia tiles, asserts canvas `role` + `aria-label`, hidden table present, legend swatches present, toggle switches north/south, no hatch in default; build check asserts `vite.config.ts` Stadia `runtimeCaching` URL pattern
