# 03: Where-am-I vs oval distance pill (Geolocation single-shot)

**What to build:** A privacy-preserving "Where am I vs oval?" pill on Home that answers *how far to aurora* for the chaser's current position without persisting location, with a manual lat/lon fallback so it works when permission is denied or Geolocation is unavailable.

**Blocked by:** 01 (needs the Home dashboard reflow and the live banner context that 01 puts in place; no hard dependency on alerts)

**Status:** ready-for-agent

- [ ] Home shows a button "Where am I vs oval?" that on tap calls `getCurrentPosition({enableHighAccuracy:true, timeout:8000, maximumAge:60000})`, formats a pill like `Aurora ~{km} km N · ±{accuracy} m` (placeholder distance derived from the Kp-based latitude stub clearly labelled "approx. — OVATION map in Horizon 2"), and warns when accuracy is poor
- [ ] When permission is denied, times out, or `navigator.geolocation` is absent, the pill falls back to two manual number inputs (lat/lon) that render the same distance pill; no `localStorage` persistence unless the user opts into a future "Remember" that is not part of this ticket
- [ ] Tests mock `navigator.geolocation` for success/deny/absence and assert the pill, fallback inputs, accuracy text, and that nothing is written to `localStorage`
