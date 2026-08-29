# 03: Opt-in auto-refresh + UAF Poker Flat live cam

**What to build:** Consent-gated continuous refresh: a native checkbox setting (default off, honest data-use copy) that, when enabled, reloads refreshable image cards on the operator's own cadence and drives the UAF Poker Flat cam from its live SSE feed. Refreshing pauses while the tab is hidden.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Auto-refresh is a native checkbox, default off, persisted in versioned local storage, with honest copy ("Auto-refresh images — uses data"); checked state is the announcement (no aria-pressed)
- [ ] When on, each refreshable image card reloads its still at least as slowly as the operator's own cadence (never faster), cache-busted so the browser can't serve a stale frame
- [ ] Refreshing stops while the tab is hidden and resumes when it becomes visible; the manual refresh control keeps working regardless of the setting
- [ ] UAF Poker Flat updates from its CORS-open SSE feed while auto-refresh is on and the tab is visible (~5–15 s frames); on feed failure the card shows an honest "live feed unavailable" fallback with the operator link
- [ ] The Twitch player card and link rows never auto-refresh
- [ ] Tests: fake timers (only refreshable entries reload, at ≥ cadence), mocked visibilitychange (pause/clear, resume/re-arm), mocked SSE (message updates the image, error falls back); typecheck, build and the unit suite are green