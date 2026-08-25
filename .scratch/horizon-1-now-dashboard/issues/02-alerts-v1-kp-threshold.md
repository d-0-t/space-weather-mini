# 02: Alerts v1 — Kp threshold in localStorage + in-app banner + opt-in browser Notification

**What to build:** A chaser-set Kp threshold that drives a foreground alerts banner on Home: a slider persists in `localStorage`, the app polls the alerts feed and the live scales/forecast, shows matching watches/warnings in the banner, and offers an explicit "Enable browser alerts" tap for system notifications while remaining honest about "alerts while this tab is open".

**Blocked by:** 01 (needs the live Scales/Kp/Dst vocabulary, freshness pattern, and Home dashboard slots that 01 establishes)

**Status:** ready-for-agent

- [ ] Home exposes a Kp threshold control (range 1–9, default 5 = G1) persisted as versioned `localStorage` (`{kp}`) and hydrates on mount; G bonus labels are shown when the threshold maps to G1–G5
- [ ] Home polls the alerts feed every 5 min, filters to `WATCH`/`WARNING`/`ALERT` where `G` or forecast `kp` meets the threshold (including the next-24h forecast window), dedupes by `product_id|issue_datetime` (cap 200), and renders up to 3 newest matches as an in-app banner even without Notification permission
- [ ] An explicit button "Enable browser alerts" calls `Notification.requestPermission()` on user gesture and, if granted, fires system notifications for new matches while the tab is open; copy is honest about foreground-only and iOS Home-Screen prerequisite, with `aria-live="polite"` and a stale-cache advisory when the feed is unreachable
