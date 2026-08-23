# 0001: Client-side only architecture

The app is a static SPA that fetches NOAA SWPC products directly from `services.swpc.noaa.gov` — no backend, no proxy, no database. Preferences stay in `localStorage`.

Why: a backend buys caching, rate-limit control, and push-capable alerting, but it costs a server, an API contract, CORS handling, and the static deploy (Netlify/gh-pages) that keeps this app zero-ops and free. The data is public, read-only, and already CORS-enabled; the app is informational, not decision-critical, so stale-while-revalidate plus manual refresh is enough.

**Status**: accepted

**Consequences**:

- No user accounts; alerting beyond what the browser can do locally is out of scope.
- Data freshness is bounded by NOAA's update cadence and the browser's cache; an "As of" timestamp per product is required.
- If a future feature needs caching or push (e.g. reliable threshold alerts), the backend is added at that point — the static contract (`string → Product` parsers, TanStack Query keys per URL) is designed so the data layer is the only thing that changes.