# 09 — Current-conditions dashboard

**What to build:** the home page becomes a current-conditions dashboard: today's Kp and A indices (from the daily geomagnetic indices model), the latest geophysical alert summary, the aurora forecast images for north and south, and per-product issued times with links to the migrated product pages. Built fresh — not a repurposed leftover.

**Blocked by:** 01 — Toolchain migration, 03 — 27-day outlook end-to-end, 04 — Daily geomagnetic indices end-to-end, 08 — Geophysical alert end-to-end

**Status:** ready-for-agent

- [ ] `/` shows today's Kp and A indices with storm-scale coloring
- [ ] `/` shows the latest geophysical alert summary with its as-of time
- [ ] `/` shows the north and south aurora forecast images with alt text
- [ ] Per-product issued times are shown for the products the dashboard draws on
- [ ] Links to the migrated product pages work; the dashboard passes smoke test, Playwright journey, and axe audit