# 03: Opt-in auto-refresh + UAF Poker Flat live cam

**What to build:** Consent-gated continuous refresh: a native checkbox setting (default off, honest data-use copy) that, when enabled, reloads refreshable image cards on the operator's own cadence and drives the UAF Poker Flat cam from its live SSE feed. Refreshing pauses while the tab is hidden.

**Blocked by:** 01

**Status:** done

- [x] Auto-refresh is a native checkbox, default off, persisted in versioned local storage, with honest copy ("Auto-refresh images – uses data" – en dash per the repo's em-dash ban); checked state is the announcement (no aria-pressed)
- [x] When on, each refreshable image card reloads its still at least as slowly as the operator's own cadence (never faster – `max(cadenceMinutes, 1)`), cache-busted with `?t={Date.now()}` so the browser can't serve a stale frame
- [x] Refreshing stops while the tab is hidden (visibilitychange) and resumes when it becomes visible; the page-level Refresh button works regardless of the setting and the tab state
- [x] UAF Poker Flat updates from its CORS-open SSE feed (`allsky.gi.alaska.edu/src/checkLive.php?cam=poker-flat` – the ticket's URL omits `/src/`; the research doc and a live probe 2026-08-29 confirm it) while auto-refresh is on and the tab is visible (~5–15 s frames); on feed failure the card shows an honest "live feed unavailable" fallback with the operator link, and the freshness claim is withheld while the feed is down
- [x] The Twitch player card and link rows never auto-refresh
- [x] Tests: fake timers (only refreshable entries reload, at ≥ cadence; Refresh busts every card; per-card "Loaded" time updates), mocked visibilitychange (pause/clear, resume/re-arm), mocked SSE (message updates the image, error falls back and recovers, feed closes on consent-off/toggle-off/hidden and reopens); typecheck, build and the unit suite are green (373 passed)

## Comments

Implemented 2026-08-29. Deviations from the ticket text are deliberate user decisions (confirmed in-session):

- **One page-level Refresh button, not per-card controls.** The h1 row is now `webcams__header` (flex `space-between`): the h1 on the left; **Refresh**, **Filter**, **Hidden sources (N)** and the auto-refresh checkbox in the toolbar on the right (user decision – "no individual refresh buttons on cards"). Refresh busts every image card's still with `?t=`; the live cam is SSE-driven and never interval-refreshes.
- **UAF Poker Flat is its own component, like the Twitch card** (user decision): a new `type: "live"` registry entry (`WebcamLiveEntry` with `sseUrl` + `frameBaseUrl`, contract-tested), rendered in its own **"Live cam"** section (jump pill "Live cam") after the image regions and before the Twitch stream. Its `imageUrl` is the verified daytime placeholder `images/poker-notdark.jpg` (the swap ticket 01 asked for; probed live 2026-08-29).
- **Per-card "Live updates" toggle** (user decision): a native checkbox on the live card, default on, visit-only (not persisted), disabled while the global auto-refresh is off. It gates the SSE feed alongside the global consent and the visible tab.
- **Freshness is per-card now**: every card owns its `src` and "Loaded HH:MM"; reloads (manual, cadence, or SSE frame) update both. The stamp is set at reload-call time, not after the fetch resolves (browsers can't observe image load completion for cross-origin stills – same boundary ticket 01 accepted).
- **Honest off-states**: whenever the live feed stops (toggle off, consent off, or tab hidden) the live card reverts to the placeholder still, so the "placeholder frame" label can never sit over a real frame; while the feed is failed the freshness claim is withheld entirely (the fallback note is the statement).
- **Em dash → en dash**: the ticket's copy "Auto-refresh images — uses data" ships as "Auto-refresh images – uses data" because the repo's en-dash test bans the em dash character in code.
- **Pre-existing red suite fixed**: `Nav.test.tsx` pinned "Geophysical Alert" as the first Details submenu item, but `Nav.tsx` ships Daily Data first (the user's order). The test now pins Daily Data – `Nav.tsx` itself was NOT touched (user constraint).
- **Test infrastructure**: `setupTests.js` gains an inert `EventSource` shim (jsdom lacks it), mirroring the existing `<dialog>` shim; the SSE tests stub a scripted `MockEventSource` with `vi.stubGlobal`.
- **Vocabulary**: CONTEXT.md gains **Live cam** and **Live updates** (the SSE entry and its per-card switch); `coding-standards.md` §Data-fetching records the webcams exceptions (manual Refresh button, EventSource instead of TanStack Query).