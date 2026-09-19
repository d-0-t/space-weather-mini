# 0001: Client-side only architecture

The app is a static SPA that fetches NOAA SWPC products directly from `services.swpc.noaa.gov` — the data layer stays direct and preferences stay in `localStorage`. The push sender is the one named exception to this rule (amendment 2026-09-19 below).

Why: a general backend buys caching and rate-limit control, but it costs ops, an API contract, CORS handling, and the static deploy (Netlify) that keeps this app zero-ops and free. The data is public, read-only, and already CORS-enabled; the display itself is informational, not decision-critical, so stale-while-revalidate plus manual refresh is enough for everything the SPA renders. Background alerts are the one capability promoted to decision-critical since (amendment below): waking a closed phone needs a sender that stays awake, so that one capability lives beside the SPA instead of in it.

**Status**: accepted (amended 2026-09-19)

**Amendment 2026-09-19 (background-alerts ticket 08)**: background alerts are promoted to decision-critical. The app gains one narrowly-scoped exception — the push sender (`CONTEXT.md` Push sender): a scheduled poll plus subscribe/unsubscribe/test endpoints beside the SPA that evaluate every stored push subscription against the chaser's own alert settings and fan out Web Push pokes. It stores only the push address, the Alert threshold, the stored place with short name and timezone, the alert type toggles and the Live alert gates — no accounts, no names, no location tracking. The static contract holds: parsers and query keys are unchanged, and the sender reuses the app's own grading, darkest-window and reach-edge seams. Storage behind the sender is decided separately (ADR-0012).

**Consequences**:

- No user accounts; the push address is the identity and every settings change overwrites blindly, while disabling forgets the chaser entirely.
- Data freshness is bounded by NOAA's update cadence and the browser's cache; an "As of" timestamp per product is required.
- A subscription-lifecycle consequence is added: the client re-sends settings on every change, re-subscribes cleanly when stored state is gone, and the sender prunes push addresses the push service reports gone.