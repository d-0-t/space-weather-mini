# 02: Push foundation — owned worker, subscribe plumbing, scheduled poll

**What to build:** an installed chaser can enable browser alerts and the sender remembers the subscription; a test poke arrives with tap-to-open. The scheduled NOAA poll runs every few minutes against the stored subscriptions (matching logic for the three types lands in later tickets).

**Blocked by:** 01 (Remove gh-pages deploy).

**Status:** done

- [x] Enabling alerts requests permission on tap, creates the push subscription with the app-server key, and stores the full settings object (subscription, Alert threshold, stored place + short name, place timezone, type toggles, hindrance gates); changing any setting re-sends and overwrites; disabling deletes the subscription.
- [x] Subscription storage sits behind a 3-method seam (save / load-all / remove) starting on the built-in Netlify key-value store, so a future Postgres move touches nothing else.
- [x] The service worker is owned by the repo (migrated off the generated worker) with push (always shows a visible notification inside the wait-until chain) and tap (closes, focuses or opens the alerts view) handlers.
- [x] A manual test control fires one canned poke end to end on a real installed phone.
- [x] Dead subscriptions are pruned when the push service reports them gone.
- [x] Manual human steps (checklist in the ticket comments when done): VAPID pair generated locally with the private key never committed; VAPID + contact env vars set in the Netlify dashboard; verified once each on a real Home-Screen-installed iPhone and Android.

## Comments

### Implemented 2026-09-18 (agent, awaiting human review — NOT committed)

TDD seams (agreed with user): subscription-settings (pure validator), the
3-method subscription-store seam (memory backend + Blobs backend), the
push-payload builder + owned `src/sw.ts` handlers + the injectManifest
migration, and the subscribe-client + sender handlers. Each landed as a RED
test first, then the minimal GREEN implementation.

**New modules (all under `src/push/` unless noted):**

- `subscription-settings.ts` – the full settings object the app POSTs:
  subscription (endpoint + p256dh/auth keys), Alert threshold, stored place
  lat/lon + short name, place timezone, three alert type toggles, hindrance
  gates (all default on, under 50% cloud, Astronomical Twilight). Strict
  validator: the sender never stores a half-valid chaser.
- `subscription-store.ts` – the 3-method seam (save / load-all / remove)
  keyed by the subscription endpoint, with an in-memory backend (tests) and
  a Blobs backend (each endpoint keyed by its SHA-256 digest so the push
  address never lands raw in a key; corrupt entries skipped). Overwrites
  are blind and keep the record's dedupe state.
- `push-payload.ts` – the poke payload (title/body/tag/data only, the
  fields WebKit honors) with the event key as collapse tag; TTLs follow the
  spec catch-up rule (daily/forecast ~12h, live/test ~1h). The worker's
  payload parser returns null for corrupt data so the worker still shows a
  visible generic notification (`push:generic`) – every push ends visible.
- `handlers.ts` – the endpoint and poll logic as pure-ish functions over
  injected deps: subscribe-overwrite (400 on malformed, dedupe state kept),
  disable-forget (204-free plain 200), the test poke with 404/410-gone
  pruning, and the scheduled poll skeleton (fetches the three NOAA
  products, sends nothing yet; matching/dedupe/fan-out are tickets 03-05).
- `web-push-sender.ts` – the single place web-push is touched; surfaces the
  push service's HTTP status so the caller can prune gone subscriptions.
  Automated tests stop at this send boundary (spec testing decision).
- `subscribe-client.ts` – the browser flow: base64url VAPID decode/encode,
  `enablePush` (subscribe with `userVisibleOnly` + application server key,
  then POST settings), `syncPushSettings`/`resendPushSettings` (the
  every-change overwrite path), `disablePush` (DELETE + unsubscribe),
  `fireTestPoke`, and the existing-subscription detection on mount.
- `src/sw.ts` + `src/push/sw-config.ts` – the owned worker: same precache
  globs, `NavigationRoute("index.html")`, skipWaiting/clientsClaim, and the
  same swpc/ovation-jpg/flags routes with 7-day expiry, all declarative and
  unit-pinned; plus the push and notification-tap handlers (tap closes,
  focuses an open window and navigates it to the poke's URL when it
  differs, else opens the URL).
- `netlify/functions/subscribe.mts`, `unsubscribe.mts`, `send-test.mts`,
  `poll-alerts.mts` + shared `lib/push-store.ts` – thin Netlify adapters
  over the tested handlers; the poll runs every 5 minutes on the published
  deploy.

**UI wiring (Alerts settings modal, minimal for the foundation; ticket 06
grows the full settings UI):** after a tap-granted permission the Enable
button subscribes and stores; when the browser holds a subscription the
modal shows "Background alerts on.", a "Send test poke" control with an
honest sent/failed line (`aria-live`), and "Disable background alerts"
(one tap forgets the chaser entirely). Threshold changes and place picks
re-send and overwrite the stored settings (no-op while nothing is
subscribed). Background-alert attempts that fail (no application server
key, no worker, sender rejected) stay silent so the in-app strip and local
notifications keep working; failure routing to the guide is ticket 07.

**Code review (Standards + Spec sub-agents) – all substantive findings fixed:**

- Dead `placeForSender` helper deleted; its shape already lives in
  `collectSettings`.
- The four duplicated `subscriptionStore()` factories extracted into
  `netlify/functions/lib/push-store.ts` (the single, documented
  `as unknown as BlobsKV` cast lives there alone: the Blobs `Store` class
  carries private members, so it never matches a structural interface).
- The duplicated every-change re-send shape in `setThreshold` and the place
  `pick` extracted into `resendPushSettings()` (subscribe-client).
- The test poke's URL construction moved into `fireTestPoke` beside its
  siblings in subscribe-client.
- Memory store's `records` map is now the declared
  `MemorySubscriptionStore` test affordance (no reach-in cast in tests).
- Tap now lands at the poke's URL, not just "any open window".
- Kept deliberately (judgement calls, argued by the ticket text): the poll
  skeleton's `send` dep is the tickets 03-05 fan-out boundary the spec's
  testing decision pins ("automated tests stop at the send call
  boundary"); the store's `seenKeys` bookkeeping is the spec's dedupe key
  family arriving with the seam; `VITE_VAPID_PUBLIC_KEY` env typing added
  beside the existing flag key.
- Noted for the record (not deferred work): a `getKey` returning null would
  surface as a sender 400 rather than a client-side message – acceptable
  for the foundation, ticket 07's failure panels replace the dead end.

**Verification:**

- `npm run typecheck` (now two programs: the app + `tsconfig.sw.json` for
  the owned worker): clean.
- Full unit suite: 1055/1056 pass. The single failure
  (`ArrangeModal.test.tsx` → "notes on the Pinned webcams row") is
  pre-existing and unrelated (documented in ticket 01; fails identically
  on the pristine tree).
- `vite build`: injectManifest emits `dist/sw.js` (20 precache entries)
  containing the push + notificationclick handlers and the unchanged
  runtime routes; no separate workbox-\* chunks (bundled inline).
- `npx playwright test e2e/offline.spec.ts`: 5/5 pass on the migrated
  worker. Full smoke suite with retries: 20/20.

**Manual human steps (checklist, ~5 min once):**

1. Generate the VAPID pair locally and keep the private key out of git:
   `npx web-push generate-vapid-keys` (or
   `npx web-push generate-vapid-keys --json > .vapid.json`).
2. Set env vars in the Netlify dashboard (Site configuration → Environment
   variables):
   - `VAPID_PUBLIC_KEY` – the public key (base64url).
   - `VAPID_PRIVATE_KEY` – the private key (base64url).
   - `VAPID_CONTACT` – a `mailto:` contact URI the push services require.
   - `VITE_VAPID_PUBLIC_KEY` – the same public key, baked into the SPA so
     `subscribe()` gets the applicationServerKey.
3. Netlify provisions Blobs and the `*/5 * * * *` schedule from code on
   push (scheduled functions deploy with the site; Blobs is built in).
4. Verify once on a real Home-Screen-installed iPhone (iOS 16.4+): open
   the installed app → Alerts → Enable browser alerts → Send test poke →
   notification arrives with tap-to-open. Repeat once on a real Android
   (installed PWA). Emulators cannot do push; delivery is not automatable.
