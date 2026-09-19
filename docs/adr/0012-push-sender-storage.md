# 0012: Push sender storage on Netlify Blobs, Postgres later

The push sender (ADR-0001 exception) stores every push subscription behind the 3-method seam in `src/push/subscription-store.ts` — save / load-all / remove — starting on the built-in Netlify key-value store (Netlify Blobs).

Why: the sender needs a place to remember the push address (the no-accounts identity) plus the chaser's threshold, place, timezone and gates between polls, but nothing else needs a database. Blobs is provisioned from code on push and holds one JSON record per subscription, looked up by the SHA-256 digest of its push address (the address itself never lands raw in a storage key); corrupt entries are skipped so one bad record cannot break a poll. A future Postgres move is anticipated but not built.

**Status**: accepted

**Considered Options**:

- Postgres now — a real table with queries and migrations, but ops and cost for a subscription count Blobs handles.
- Blobs now, Postgres later — picked: zero new infra, and the seam makes the cutover a backend swap.

**Consequences**:

- The trigger for migrating is scale or query need: record counts or list costs that outgrow a key-value store, or a future feature that needs queries Blobs cannot express.
- On migration day the 3-method seam is what stays untouched: the poll, the fan-out, the subscribe/unsubscribe handlers and the client keep calling save / load-all / remove unchanged — only a new Postgres backend behind the same interface is added. The stored record shape (settings plus the `seenKeys` dedupe family) and the blind-overwrite rule carry over untouched.
