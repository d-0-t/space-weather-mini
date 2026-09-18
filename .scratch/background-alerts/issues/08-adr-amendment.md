# 08: ADR amendment — push-sender exception to client-side-only

**What to build:** the architecture record honestly reflects the backend: the client-side-only ADR gains the push-sender exception it already anticipated, and the storage-seam decision is recorded.

**Blocked by:** 03 (Kp alert type), 04 (Daily outlook alert), 05 (Live summary-word alert).

**Status:** ready-for-agent

- [ ] The client-side-only ADR is amended: app stays static and reads NOAA directly; the push sender (scheduled poll + subscriptions + fan-out) is the named, justified exception.
- [ ] A short decision record captures Blobs-now-Postgres-later: the seam, the trigger for migrating, and what stays untouched on migration day.
- [ ] No stale "no backend" claim remains in the amended ADR, the README statement, or the research brief's tension notes.
