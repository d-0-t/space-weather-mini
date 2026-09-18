# Background-Running Alerts in This PWA on Mobile — Research

**Date:** 2026-09-18
**Audience:** Maintainers of Space Weather Mini (mobile chasers, field use, installable PWA)
**Constraint:** Stay client-side only per [ADR-0001](../adr/0001-client-side-only-architecture.md) — static SPA on Netlify, direct `fetch` from `services.swpc.noaa.gov` (CORS `*`), preferences in `localStorage`. No backend. Anything needing a server is flagged with an explicit ADR-0001 tension note and an amendment proposal (§6.5).
**Scope:** Can the app's Alert threshold + Alerts feed alerts reach a phone that is closed / in a pocket? Covers Web Push on mobile in 2026, serverless-without-backend senders, pure-client background alternatives, Notification Triggers status, iOS gotchas, and a ranked recommendation with a technical sketch for this repo.

> Research against primary sources only: W3C Push API, IETF RFC 8291/8292 family via web.dev, WHATWG Notifications, WICG Periodic Background Sync, MDN, web.dev, Chrome developer docs, WebKit blog + Apple developer docs + WWDC22, vite-plugin-pwa and Workbox docs, Firebase/ntfy/OneSignal/Supabase/Netlify first-party docs, caniuse, Playwright docs. Each claim cites its owner. Secondary write-ups were used only to locate the primary source and are not cited for facts.

**Repo baseline (verified by reading files):** `vite.config.ts:15` `PWA_OPTIONS` uses `generateSW` + `registerType: autoUpdate` + `manifest: false` (custom `public/manifest.json`, `display: standalone`); Workbox `StaleWhileRevalidate` on `services.swpc.noaa.gov/(json|text|products)` and `CacheFirst` on OVATION JPGs/flagcdn, 7-day expiry. Alerts poll the Alerts feed + NOAA Scales + Planetary K-index (live) forecast every 5 min with `refetchIntervalInBackground: true` (`src/components/pages/home/components/Alerts/AlertsContext.tsx:144-169`), Alert threshold 1–9 persisted versioned in `localStorage` (`src/products/thresholds.ts`), dedupe keys `product_id|issue_datetime` (`src/products/alerts.ts:115`), system notification via `registration.showNotification()` with `new Notification` fallback (`AlertsContext.tsx:66-82`), and footnote copy "desktop only, while tab is open" (`Alerts.tsx:127-130`).

---

## Executive Summary

There is **no standards-based way for a static-only app to wake a closed mobile browser and show an Alert threshold breach**. Every path that survives "app closed, phone in pocket" terminates in a backend sender: Web Push requires an application server holding VAPID keys, stored `PushSubscription`s, and per-breach POSTs to the browser vendor's push service ([web.dev how-push-works](https://web.dev/articles/push-notifications-how-push-works), [W3C Push API](https://www.w3.org/TR/push-api/)). That is a direct ADR-0001 tension, not a workaround.

Within that hard boundary, three honest options emerge:

- **Option A — Stay foreground + honest copy + Android-only Periodic Background Sync enhancement (no backend, no ADR change).** Keep the current 5-min polling while the tab/PWA is alive, fix the footnote to describe what mobile actually does, and add `periodicsync` as a cache-freshness enhancement on Android Chrome only. Effort ~2–3 days. This is the **recommended** option.
- **Option B — Minimal push backend: scheduled edge function polling NOAA and fanning out Web Push keyed by stored Alert threshold (requires ADR amendment, new ops).** One cron sender (Netlify Scheduled Function or Supabase `pg_cron` + Edge Function) polls `alerts.json` / `noaa-scales.json` / Kp forecast, evaluates per-subscription thresholds from `product_id|issue_datetime` dedupe keys, and POSTs VAPID-signed pushes. Effort ~1–2 weeks + ongoing ops. Real background alerts on both platforms, at the cost ADR-0001 was written to avoid.
- **Option C — Delegate to a third-party pusher (ntfy app, OneSignal, or FCM SDK).** No custom sender to run, but the chaser installs a second app or the project accepts a vendor SDK, vendor-held subscriptions, and topic/privacy trade-offs — still an ADR-0001 tension (a backend exists, it is just someone else's). Effort ~3–5 days + vendor account + privacy review.

Do not build on Notification Triggers (`showTrigger`/`TimestampTrigger`): Chrome's own docs say development "has ended" ([Chrome notification-triggers](https://developer.chrome.com/docs/web-platform/notification-triggers)). Do not promise background delivery from hidden-tab React Query polling: mobile OSs throttle/freeze timers and iOS evicts idle site data.

---

## 1. Web Push (Push API + Notifications API + Service Worker) on Mobile 2026

### 1.1 Support matrix — Android Chrome vs iOS Safari

| Capability | Android Chrome | iOS / iPadOS Safari | Primary source |
|---|---|---|---|
| Push API (`pushManager.subscribe`, `push` event wakes SW when closed) | ✅ Supported (FCM transport under the hood) | ✅ iOS/iPadOS **16.4+ only, and only inside a Home-Screen-installed web app** — a plain Safari tab cannot subscribe | [WebKit: Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [WebKit: features in Safari 16.4](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/), [caniuse: Push API](https://caniuse.com/push-api) (iOS 3.2–16.3 ❌, 16.4+ partial) |
| Notifications API via SW `showNotification()` | ✅ | ✅ same gate (installed app, 16.4+) | [caniuse: Web Notifications](https://caniuse.com/notifications) (iOS 16.4+ partial), [Apple: Sending web push](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers) |
| `PushManager` / subscription `endpoint` | ✅ | ✅ 16.4+ in installed context | [caniuse: PushManager](https://caniuse.com/mdn-api_pushmanager) |
| macOS Safari (for contrast) | n/a | ✅ Safari 16+ on macOS Ventura for ordinary sites, no install needed | [WebKit: Meet Web Push](https://webkit.org/blog/12945/meet-web-push/), [Apple: Sending web push](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers) |
| All iOS browsers | n/a | Same WebKit rules — Chrome/Edge/Firefox on iOS use WebKit, so the Home Screen gate applies to them too | [Apple: Sending web push](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers) (APNs-backed, no Developer Program needed) |

Correction to carry forward: the prior research note "EU 17.4+: standalone removed → no notification" is **out of date**. Apple announced removal of Home Screen web apps in the EU during the iOS 17.4 beta, then **reversed it before release** — Home Screen web apps "continue to be built directly on WebKit and its security architecture" in the EU ([Apple Developer Support: DMA and apps in the EU](https://developer.apple.com/support/dma-and-apps-in-the-eu/), as quoted in the contemporaneous [Apple developer forums thread](https://developer.apple.com/forums/thread/745414)). Do not ship EU-specific "no standalone" copy.

### 1.2 Permission and engagement rules

- **User gesture required.** iOS/iPadOS prompts for push permission only "in response to direct user interaction — such as tapping on a 'subscribe' button" ([WebKit iOS web push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)); Safari on macOS likewise requires an explicit gesture ([WWDC22 Meet Web Push](https://developer.apple.com/videos/play/wwdc2022/10098/?time=814)). The repo's existing `enableBrowserAlerts` (tap → `Notification.requestPermission()`, `AlertsContext.tsx:264-272`) already follows this rule — keep it.
- **Subscribe after permission, from the installed app.** The standard order is register SW → `requestPermission()` on tap → `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` ([web.dev: subscribing a user](https://web.dev/articles/push-notifications-subscribing-a-user), [MDN: PushManager.subscribe](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe)). On iOS the first two steps must happen inside the Home Screen launch, not the Safari tab. Never prompt on load.
- **Chrome quiet-notification / permission posture** can suppress or quieten prompts on low-engagement origins; the repo should therefore prompt in context (the Alerts modal, next to the Alert threshold slider), not on first visit. The subscribe-then-save pattern and permission-first control are the web.dev-recommended flow ([web.dev: subscribing a user](https://web.dev/articles/push-notifications-subscribing-a-user)).
- **`userVisibleOnly: true` is mandatory in practice.** Chrome's `subscribe()` rejects without it, and Safari "doesn't support invisible push notifications" — every push must produce a visible notification ([MDN: PushManager.subscribe](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe), [Apple: Sending web push](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers), [WebKit: Declarative Web Push](https://webkit.org/blog/16535/meet-declarative-web-push/)).

### 1.3 Payload encryption (VAPID) and the hard backend requirement

- **VAPID = the sender's identity.** The `applicationServerKey` passed to `subscribe()` is the app server's ECDSA P-256 public key; the push service ties the subscription endpoint to that key and rejects sends not signed by the matching private key ([W3C Push API: applicationServerKey](https://www.w3.org/TR/push-api/), [web.dev: web push protocol](https://web.dev/articles/push-notifications-web-push-protocol)).
- **Payloads are end-to-end encrypted (RFC 8291 `aes128gcm`).** The browser generates per-subscription `p256dh` + `auth` keys; the server encrypts with them, and the push service (Google/Mozilla/Apple) relays opaque bytes it cannot read ([RFC 8291](https://datatracker.ietf.org/doc/html/rfc8291/), [W3C Push API: getKey(p256dh/auth)](https://www.w3.org/TR/push-api/), [web.dev: web push protocol](https://web.dev/articles/push-notifications-web-push-protocol)).
- **The sender is always a server.** web.dev's architecture is explicit: client subscribes → `PushSubscription` (endpoint + keys) is sent to "your backend / server" and saved "to a database" → the server POSTs to the push service endpoint when there is something to say ([web.dev: how push works](https://web.dev/articles/push-notifications-how-push-works)). The `web-push` library flow (`setVapidDetails` + `sendNotification(subscription, payload)`, prune on 404/410) assumes a Node sender with secrets ([web.dev: sending with web-push libraries](https://web.dev/articles/sending-messages-with-web-push-libraries), [web.dev: server codelab](https://web.dev/articles/push-notifications-server-codelab)). **A static SPA cannot hold the VAPID private key or fan out per-user POSTs — real Web Push always violates ADR-0001 as written.** Flagged; amendment in §6.5.

### 1.4 What the Service Worker must do

Two handlers, both in SW scope ([MDN: push event](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/push_event), [MDN: notificationclick](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/notificationclick_event), [web.dev: handling messages](https://web.dev/articles/push-notifications-handling-messages), [WWDC22](https://developer.apple.com/videos/play/wwdc2022/10098/?time=814)):

1. **`push` → `showNotification()` inside `event.waitUntil()`.** Keep the worker alive with the promise chain and display the notification before it settles; Chrome shows a generic "This site has been updated in the background." fallback when the chain is broken, and Safari revokes permission after silent pushes (quotas in §5).
2. **`notificationclick` → `close()` + focus/open the Dashboard.** `event.notification.close()`, then `clients.openWindow()` / focus the Alerts strip deep link; read `event.action` for action buttons (note: WebKit ignores `actions`, §5).

Minimal shape (adapts the web.dev handler to this repo's dedupe keys):

```ts
// src/sw.ts (injectManifest) — push + click handlers
self.addEventListener("push", (event: PushEvent) => {
  const data = event.data?.json() ?? {};
  // Payload carries the same dedupe key as src/products/alerts.ts alertKey:
  // { title, body, key: "product_id|issue_datetime" | "scales:current:G" | "forecast:…", url: "/#alerts" }
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Space weather alert", {
      body: data.body ?? "",
      tag: data.key, // replaces repeats of the same Geophysical alert
      data: { key: data.key, url: data.url ?? "/#alerts" },
    }),
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/#alerts";
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const hit = wins.find((w) => "focus" in w);
      if (hit) return hit.focus();
      return self.clients.openWindow(url);
    })(),
  );
});
```

Notification display itself follows the Notifications standard ([WHATWG Notifications](https://notifications.spec.whatwg.org/)) via `ServiceWorkerRegistration.showNotification()` ([MDN: showNotification](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification)).

### 1.5 What changes in vite-plugin-pwa to own push events

- **Today (`generateSW`) the SW is Workbox-generated.** There is no owned `push` handler; the plugin emits precache + runtime-caching only. Push needs owned SW code, so the strategy must change to **`injectManifest`** with a custom `src/sw.ts` that calls `precacheAndRoute(self.__WB_MANIFEST)` plus the handlers above ([vite-plugin-pwa: injectManifest guide](https://vite-pwa-org.netlify.app/guide/inject-manifest), [vite-plugin-pwa: workbox injectManifest](https://vite-pwa-org.netlify.app/workbox/inject-manifest), [Workbox: which mode to use](https://developer.chrome.com/docs/workbox/modules/workbox-build/#which-mode-to-use)).
- **The plugin maintainers confirm this split:** push-notification support questions are answered with "you need `injectManifest`, that is, you need to build your service worker" ([vite-plugin-pwa issue #84](https://github.com/vite-pwa/vite-plugin-pwa/issues/84)); the docs' push section points at Workbox notification docs + the Elk reference implementation and a `workbox` background-sync sample ([vite-plugin-pwa: server push notifications](https://vite-pwa-org.netlify.app/workbox/inject-manifest#server-push-notifications), [docs issue #132](https://github.com/vite-pwa/docs/issues/132)).
- **Lighter alternative (no strategy change): `workbox.importScripts`.** A community-tested pattern keeps `generateSW` and injects push listeners via `workbox: { importScripts: ["/service-worker/push.js"] }` ([docs issue #132](https://github.com/vite-pwa/docs/issues/132)). Viable for a spike, but the file is unbundled/untyped and ordering-sensitive — `injectManifest` is the maintained path for anything pushed to production.
- **Keep the current runtime-caching routes** by re-declaring them in `src/sw.ts` with `workbox-routing`/`workbox-strategies` (`StaleWhileRevalidate` for SWPC JSON/text/products, `CacheFirst` for OVATION/flags, 7-day expiry) and keep `registerType: autoUpdate` + `clientsClaim`/`skipWaiting` semantics per the injectManifest auto-update recipe ([vite-plugin-pwa: injectManifest guide](https://vite-pwa-org.netlify.app/guide/inject-manifest)). The existing `vite.config.test.ts` route/expiry seams and `e2e/offline.spec.ts` cover the migration.

---

## 2. Serverless-Without-Backend Options (and Their ADR-0001 Tension)

None of these is "no backend" — each moves the sender off the maintainer's server, but a sender still exists. The table states who holds what so the ADR-0001 call is explicit.

| Option | Who holds the `PushSubscription` | Who polls NOAA | Cost / ops | Privacy | ADR-0001 verdict |
|---|---|---|---|---|---|
| **A. Self-run `web-push` sender (reference)** — Node `web-push` + subscription DB, own cron | You (DB table: endpoint, `p256dh`, `auth`, Alert threshold, seen `alertKey`s) | Your cron (fetch Alerts feed / NOAA Scales / Kp forecast every ~5 min) | Free libs, but a real service to deploy/monitor/secret-manage | Best: subscriptions stay in your store, payloads E2E-encrypted per RFC 8291 | ⚠️ **Violates as written** — needs the §6.5 amendment |
| **B. Firebase Cloud Messaging (web)** — FCM SDK + `getToken({ vapidKey })`, `firebase-messaging-sw.js` | Google (FCM registration tokens; send subscription/FID to your app server, which still fans out) | Still your server (FCM is transport + console, not a NOAA poller) | FCM send free; Firebase project + service accounts + Google infra dependency | Subscriptions + metadata in Google infra; page takes the FCM SDK | ⚠️ **Violates** — adds a Google backend *and* you still need the polling sender |
| **C. ntfy (app + pub-sub)** — chaser installs the ntfy app, subscribes to a topic; anything POSTs to it | ntfy (topic subscription in their app / `ntfy.sh` or self-hosted) | Nobody built-in — your edge cron or the chaser's own script POSTs `https://ntfy.sh/<topic>` | Free public server or self-hosted (open source); no SDK | Topic names on a public server are guessable — treat as passwords, use auth/reserved topics for anything beyond self-monitoring | ⚠️ **Violates in spirit** — push works, but only inside ntfy's app, not this PWA; background notifications via Web Push only on the server hosting the ntfy web app |
| **D. OneSignal (managed)** — OneSignal SDK + worker, dashboard/API sends | OneSignal (wraps FCM/APNs/Web Push; segmentation + analytics included) | Your trigger (their API still needs something to call it per breach) | Free tier to ~10k web subs, then paid; proprietary SDK + lock-in | Subscriber + engagement data in OneSignal; iOS needs the Home Screen journey anyway | ⚠️ **Violates** — vendor backend + SDK for what is still a threshold fan-out problem |
| **E. Scheduled edge cron you own (recommended sender if B is chosen)** — Netlify Scheduled Function **or** Supabase `pg_cron` + Edge Function | Your KV/Postgres (same fields as A) | The scheduled function (cron `*/5 * * * *`, fetch NOAA, evaluate thresholds, VAPID-sign sends) | Netlify: cron-scheduled serverless, 30 s execution limit, prod-deploys only. Supabase: `pg_cron` + `pg_net` invoking an Edge Function (Deno/TS), per-minute capable with Vault-held secrets | Same as A (your store), no third-party subscriber DB | ⚠️ **Violates as written** — this is the smallest possible backend; amendment in §6.5 |

First-party grounding per row: FCM web setup requires HTTPS + VAPID key + FID-to-server storage ([Firebase: get started with FCM in web apps](https://firebase.google.com/docs/cloud-messaging/web/get-started)); ntfy publish is a plain PUT/POST to a topic, the web app's background notifications use the Web Push API only on its own host, and self-hosted web-push needs VAPID keys ([ntfy docs](https://docs.ntfy.sh/), [ntfy web app](https://docs.ntfy.sh/subscribe/web/), [ntfy subscribe API](https://docs.ntfy.sh/subscribe/api/), [ntfy project](https://github.com/binwiederhier/ntfy)); OneSignal's iOS web-push path still requires manifest + Home Screen install + gesture + its worker ([OneSignal: iOS web push setup](https://documentation.onesignal.com/docs/en/web-push-for-ios)); Netlify Scheduled Functions run on cron expressions on published deploys with a 30 s limit ([Netlify: Scheduled Functions](https://docs.netlify.com/build/functions/scheduled-functions/)); Supabase schedules Edge Functions via `pg_cron` + `pg_net` with secrets in Vault ([Supabase: scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions), [Supabase Cron](https://supabase.com/docs/guides/cron), [Supabase Edge Functions](https://supabase.com/docs/guides/functions)).

Practical read for this repo: if the project ever accepts a backend, **E is the proportionate sender** (one cron file, VAPID via `web-push`, threshold evaluation reusing `alertMatchesThreshold`/`alertKey` logic server-side). B/C/D add a vendor without removing the need for something to watch NOAA per chaser threshold — they change *who runs the infrastructure*, not *whether infrastructure exists*.

---

## 3. Pure-Client Background Alternatives and Their Real Limits on Mobile

### 3.1 Capability matrix (client-only; no sender)

| Alternative | What it actually does | Mobile support 2026 | Verdict for alerts |
|---|---|---|---|
| **Periodic Background Sync** (`registration.periodicSync.register(tag, { minInterval })` → `periodicsync` event) | Lets the browser refresh caches/data while the PWA is closed so content is fresh *on next launch* | Chromium-only (Chrome/Edge 80+, Android Chrome). **Zero iOS** (Safari + WebKit: not supported). Requires installed PWA + launch as app + engagement score > 0 + previously-used network; cadence is browser-chosen, aligned with usage, power- and connectivity-aware | Enhancement only: freshen the cached Alerts feed so an Android chaser opening the PWA sees a recent strip instantly. **Cannot show a notification while closed** — firing `showNotification()` from `periodicsync` without a user-visible sync context is unreliable and misses iOS entirely |
| **One-shot Background Sync** (`registration.sync.register(tag)` → `sync` event on reconnect) | Retries *deferred work* (e.g. re-send) when connectivity returns | Same Chromium-only story; **not in WebKit or Gecko** | Wrong tool: it is retry-after-offline, not a timer. Cannot schedule threshold checks |
| **Service Worker persistence / "run forever" SW** | None — SWs are event-driven and killed; a hidden page's timers do not keep a worker alive | All browsers terminate idle workers; Safari additionally throttles SW timers aggressively (App Nap history) | There is no "keep polling from the SW every 5 min" primitive. `setInterval` in SW is not a scheduler |
| **Wake Lock** (`navigator.wakeLock.request("screen")`) | Keeps the *screen* on while the page is visible | Baseline 2025 (Chrome 85+, Safari 16.4+, Firefox 126+); **foreground only**, auto-released on `visibilitychange`/lock | Field-useful (gloved aurora watch), already the repo's posture — but it is the opposite of background: it requires the page open and visible |
| **Background Fetch** (`registration.backgroundFetch.fetch()`) | Browser-owned large downloads (movies, podcasts) with progress UI; wakes SW on completion | Chromium; requires explicit user permission and a visible download UI | Wrong tool: user-initiated bulk transfer, not threshold polling |
| **Hidden-tab React Query polling** (today's `refetchIntervalInBackground: true`) | Keeps polling while the tab is hidden *if the browser lets the page run* | Desktop: mostly survives. Mobile: throttled/frozen (see §3.2) | Foreground + recently-hidden only. Honest, not background |

Primary sources: Periodic Sync API shape + permission ([MDN: Periodic Background Sync](https://developer.mozilla.org/en-US/docs/Web/API/Web_Periodic_Background_Synchronization_API), [WICG spec](https://wicg.github.io/periodic-background-sync/)); installed-app + engagement + network + browser-chosen cadence rules ([Chrome: Periodic Background Sync](https://developer.chrome.com/docs/capabilities/periodic-background-sync)); Chromium-only compat ([caniuse: periodic background sync](https://caniuse.com/wf-periodic-background-sync), [caniuse: periodicSync](https://caniuse.com/mdn-api_serviceworkerregistration_periodicsync), [ChromeStatus](https://chromestatus.com/feature/5689383275462656)); one-shot Sync retries deferred work on reconnect ([MDN: Background Sync](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API), [MDN: offline & background](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation), [caniuse: background-sync](https://caniuse.com/background-sync)); Wake Lock is foreground-only and released when hidden ([MDN: Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)); Background Fetch is user-initiated bulk download with progress UI ([MDN: Background Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Background_Fetch_API), [MDN: offline & background](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)); Workbox's own Background Sync module is a failed-request queue retried on `sync`, not a scheduler ([Workbox: background-sync](https://developer.chrome.com/docs/workbox/modules/workbox-background-sync)).

### 3.2 Can hidden-tab polling survive on mobile?

No — not reliably, and never while closed:

- **Chrome throttles hidden pages in stages.** Aligned 1 Hz timers, then budget-based throttling after ~10 s hidden, then **intensive throttling to ~1 wake-up/minute** after 5 min hidden + silent + chained timers ([Chrome: timer throttling in Chrome 88](https://developer.chrome.com/blog/timer-throttling-in-chrome-88), [Chrome: background tabs](https://developer.chrome.com/blog/background_tabs), [Chromium: tab throttling](https://blog.chromium.org/2020/11/tab-throttling-and-more-performance.html)). A 5-min React Query interval degrades to "whenever the browser feels like it" and stops entirely once the tab is discarded or the browser is swiped away.
- **Safari is stricter.** Service-Worker timers have a documented history of ~10 s throttling/App Nap suspension ([WebKit bug 185575](https://bugs.webkit.org/show_bug.cgi?id=185575)); suspended WebContent processes may never run the timer at all. There is no iOS primitive that re-wakes a closed PWA to poll NOAA.
- **iOS evicts idle site data.** Script-created storage (including Cache/IndexedDB and registrations) for an origin with no interaction in the last 7 days of browser use is deleted under tracking prevention ([MDN: storage quotas & eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)); WebKit is additionally moving time-based eviction to a throttled weekly pass plus a 180-day default for ITP-disabled accumulation ([WebKit PR #64432](https://github.com/WebKit/WebKit/pull/64432), [WebKit commit 4fb2a09](https://github.com/WebKit/WebKit/commit/4fb2a0985cf0d6956111bf749feaf75118b7f6de)). A push subscription can therefore silently die on an unused device — the sender must already handle 404/410 pruning ([web.dev: sending with web-push libraries](https://web.dev/articles/sending-messages-with-web-push-libraries)), and the client must re-subscribe on launch.
- **Storage pressure eviction is whole-origin.** When evicted, *all* of an origin's stored data goes together, not piecemeal ([MDN: storage quotas & eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)) — another reason the threshold/subscription read path must tolerate "everything is gone" and re-onboard cleanly.

### 3.3 What UX is honestly achievable with no backend?

1. **While the PWA/tab is open (including recently hidden on desktop):** today's behavior — poll every 5 min, in-app strip + `showNotification()` when granted. Keep.
2. **On Android Chrome with the PWA installed + engaged:** Periodic Sync refreshes the cached Alerts feed so the *next launch* shows fresh data instantly; the notification itself still fires on launch, not in the background. Ship as progressive enhancement, never as a promise.
3. **Overnight "wake me at Kp 7" while the phone is locked:** impossible without a push sender. The honest copy is "Keep the app open" / "Install the app; alerts fire while it is open" — never "we'll wake you."

---

## 4. Notification Triggers / Time-Based Scheduling API Status

**Dead — do not build on it.** Chrome's own page carries the warning "The development of Notification Triggers API, part of Google's capabilities project, has ended. It wasn't clear that we could provide consistent and reliable experiences across platforms," with status Launch: Not started ([Chrome: notification triggers](https://developer.chrome.com/docs/web-platform/notification-triggers)). The `showTrigger`/`TimestampTrigger` idea (schedule `showNotification` for a future timestamp with no network and no SW run) completed an origin trial (M80–M88 era) and never shipped; the follow-up discussion records the team as "no longer pursuing this API" with Web Push as the recommended path.

Consequences for this repo:

- Scheduling a local "Kp forecast says G1 at 02:00, notify me then" purely from the SW is **not viable in 2026** — there is no shipped scheduling primitive on any mobile browser.
- `showTrigger` is absent from the maintained `showNotification()` options reference, which documents `actions/badge/body/data/dir/icon/image/lang/navigate/renotify/requireInteraction/silent/tag/timestamp/vibrate` ([MDN: showNotification](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification)). Feature-detecting `'showTrigger' in Notification.prototype` will simply fail everywhere that matters.
- Forecast-horizon alerting ("Kp predicted within 24h" leg in `AlertsContext.tsx:162-169,243-257`) therefore stays a **foreground** feature: compute on poll, show in the strip, and only fan out off-device via a push sender (Option B/C).

---

## 5. iOS-Specific Gotchas

1. **Add-to-Home-Screen gate (the big one).** iOS/iPadOS 16.4+ exposes Push + Notifications **only to installed Home Screen web apps** (`display: standalone`/`fullscreen` manifest); the same site in a Safari tab cannot subscribe, and there is no `beforeinstallprompt` — installation is a manual Share → Add to Home Screen gesture ([WebKit iOS web push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [WebKit Safari 16.4](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/)). The repo already ships `display: standalone` + `id`/`scope` (`public/manifest.json`), which is exactly the gate's prerequisite — onboarding copy must still teach the gesture.
2. **User-gesture permission.** `requestPermission()` outside direct interaction is ignored; denied-then-retry requires removal/re-add of the Home Screen app in some builds (OneSignal documents the re-add recovery path from the field: [OneSignal iOS setup](https://documentation.onesignal.com/docs/en/web-push-for-ios)). Keep the repo's tap-gated `enableBrowserAlerts` and the denied-state "allow in browser settings, then try again" copy (`Alerts.tsx:76-98`).
3. **Silent-push quota → revocation.** Every push must end in `showNotification()` before `waitUntil` settles. WebKit enforces this with a quota (three silent pushes → subscription removed) and treats show-then-immediately-close as silent ([WebKit commit b6e8acd](https://github.com/WebKit/WebKit/commit/b6e8acdb048d8dcee4212c837abe050353284db6), [WebKit commit 7ab26d3](https://github.com/WebKit/WebKit/commit/7ab26d3bede6533ba602077c94c76b6b8070dce3d), [Apple: Sending web push](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers), [WebKit Declarative Web Push](https://webkit.org/blog/16535/meet-declarative-web-push/)). Design consequence: no "sync-only" pushes on Apple platforms, ever.
4. **Option surface is minimal.** WebKit silently ignores most `NotificationOptions`: `actions`, `image`, `icon`, `badge`, `vibrate`, `silent`, `requireInteraction`, `renotify`, `timestamp` — it honors `title`, `body`, `tag`, `data`, `lang`, `dir` and fires `notificationclick` normally. Keep payloads to honored fields (title/body/tag/data/url) so Android and iOS render the same alert.
5. **Icons/badging.** Manifest `icons` (192/512 + maskable, already shipped) feed the Home Screen icon; `apple-touch-icon` remains a cheap fallback ([WebKit iOS web push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)). Badging (`setAppBadge`/`clearAppBadge`) works in installed apps once notification permission is granted — usable later for a persistent "G1 in progress" badge, not a substitute for alerts.
6. **Subscription lifetime vs 7-day eviction.** An unlaunched PWA's site data (hence its subscription registration and any client-side seen-keys) can be evicted after 7 days without launch ([MDN: storage quotas & eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)). Mitigations belong to the sender design: prune dead endpoints on 404/410, re-subscribe + re-upload threshold on every app launch, and never treat "no push" as "quiet Sun."
7. **VAPID strictness + TTL.** Apple's push service validates the VAPID JWT strictly (`aud` = endpoint origin exactly, `exp` ≤ 24 h, `sub` a valid `mailto:`/`https:` URI) and honors `TTL` (store-while-offline up to ~30 days, limited count) ([Apple: Sending web push](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers)). Use short TTLs for storm alerts (minutes–hours, not days) so a stale "G1 warning" is not delivered to a phone back online tomorrow.
8. **Debugging.** Real pushes need real hardware (Simulator does not deliver); attach desktop Safari Web Inspector to the installed app over cable and exercise the `push`/`notificationclick` handlers' breakpoints ([WWDC22](https://developer.apple.com/videos/play/wwdc2022/10098/?time=814)). Dev SW lifecycle has a known iOS race — `skipWaiting` + `clientsClaim` (already in `PWA_OPTIONS`) so the subscribing registration actually controls the app.
9. **Declarative Web Push (future, not a plan).** Safari 18.4+ adds a declarative flavor where the push carries a proposed notification that displays even if the SW handler fails — explicitly to enforce `userVisibleOnly` without the silent-push penalty box ([WebKit: Declarative Web Push](https://webkit.org/blog/16535/meet-declarative-web-push/)). Watch it; do not design around it until Android/Firefox converge.

---

## 6. Recommended Path for This Repo

### 6.1 Ranked options

**Option A — Stay foreground + honest copy + Android Periodic Sync enhancement. RECOMMENDED.**

- *What:* keep React Query polling + SW `showNotification()`; rewrite the footnote per §6.4; add `periodicsync` registration (guarded, Android-Chrome-only) that refreshes the cached Alerts feed; keep everything else identical.
- *ADR-0001:* ✅ no change. No keys, no subscriber store, no cron.
- *Effort:* **S–M (2–3 days)** — copy + `periodicsync` registration + `periodicsync` handler in the *existing* `generateSW` service worker via a small Workbox plugin/route (no `injectManifest` needed since no `push` handler is added), plus tests.
- *Limits:* no closed-app alerts on either platform; iOS gets honest foreground alerts only. That is the point — it promises nothing it cannot do.

**Option B — Minimal push backend (edge cron + VAPID fan-out). Full background alerts.**

- *What:* `injectManifest` SW with §1.4 handlers; subscribe flow storing `{ endpoint, p256dh, auth, alertThreshold }`; one scheduled function polling NOAA every ~5 min and sending per-subscription breaches with `alertKey`-stable tags.
- *ADR-0001:* ⚠️ requires the §6.5 amendment (new backend, secrets, subscriber store, ops).
- *Effort:* **M–L (1–2 weeks)** — SW migration + subscribe/onboarding UI + sender + threshold evaluation + dedupe/pruning + prod verification on real devices; plus ongoing ops (key rotation, delivery monitoring, quota handling).

**Option C — Delegate to ntfy / OneSignal / FCM.**

- *What:* fastest "phone buzzes while closed" without running a server: ntfy topic + app install (self), or OneSignal/FCM SDK integration (product).
- *ADR-0001:* ⚠️ still a backend (theirs), plus SDK/install friction and privacy review.
- *Effort:* **S–M (3–5 days)** + vendor account + privacy review + onboarding UX for a second app/SDK. Best fit only if the project decides push is product-critical but refuses to operate a sender.

### 6.2 Technical sketch for the recommended option (A)

No SW-strategy change. The `push` event is never handled, so `generateSW` stays.

1. **Copy fix (the highest-ROI line in this report).** Replace `Alerts.tsx:127-130` with honest mobile copy (§6.4). The current "desktop only" text undersells Android Chrome (installed PWA + granted permission fires while open/hidden) and oversells nothing — but it should name the Home Screen gate for iOS.
2. **Periodic Sync progressive enhancement (Android only).**
   - Gate: `'periodicSync' in registration` + permission query `navigator.permissions.query({ name: "periodic-background-sync" })` ([MDN: Periodic Background Sync](https://developer.mozilla.org/en-US/docs/Web/API/Web_Periodic_Background_Synchronization_API), [Chrome: Periodic Background Sync](https://developer.chrome.com/docs/capabilities/periodic-background-sync)).
   - Register one tag, e.g. `alerts-refresh`, with a realistic floor (`minInterval: 6–12 h` — the browser clamps to usage/engagement/power anyway; asking for 5 min is dishonest and ignored).
   - In the SW, the `periodicsync` handler re-fetches `ALERTS_URL` / `NOAA_SCALES_URL` / Kp forecast into the existing `swpc` runtime cache so next launch renders instantly. It does **not** call `showNotification()`.
   - Debug via DevTools Application → Service Workers → Periodic Sync trigger ([Chrome: Periodic Background Sync](https://developer.chrome.com/docs/capabilities/periodic-background-sync)).
3. **Keep threshold state where it is.** `localStorage` (`sw:thresholds:v1`, `sw:alerts:seen:v1`) remains correct for A — the SW never needs to read it. (Only Option B needs the IndexedDB threshold mirror, because `localStorage` is a `Window`-only API and synchronous string storage capped at ~5 MiB per origin — inaccessible from SW scope ([MDN: localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), [MDN: storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)).)
4. **No payload work in A.** The §1.4 payload design (`alertKey`-stable `tag`, `Kp breach / G scale` body, dedupe keys matching `src/products/alerts.ts:115`) is specified now so a later B consumes it unchanged.
5. **Permission onboarding (safe for iOS, ships in A, reused by B).**
   - Detect installed/standalone (`matchMedia("(display-mode: standalone)")` / `navigator.standalone`) and only then offer "Enable browser alerts" from a tap inside the Alerts modal; on iOS-not-installed show "Add to Home Screen first (Share → Add to Home Screen), then enable alerts here."
   - `Notification.requestPermission()` synchronously in the tap handler, then reflect `granted/denied/default` in existing status copy. Never prompt on load.

### 6.3 If Option B is chosen later — the delta

- Migrate `vite.config.ts` to `strategies: "injectManifest"` (`srcDir: "src"`, `filename: "sw.ts"`), re-declare precache + the three runtime routes in `src/sw.ts`, add §1.4 `push`/`notificationclick` handlers ([vite-plugin-pwa injectManifest guide](https://vite-pwa-org.netlify.app/guide/inject-manifest)).
- Mirror `{ alertThreshold, seenKeys }` into IndexedDB (async, SW-readable, quota-managed with `try/catch` + `navigator.storage.persist()`); keep `localStorage` as the UI source of truth and sync on change.
- Sender: one scheduled function (Netlify cron `*/5 * * * *` within its 30 s limit, or Supabase `pg_cron` + Edge Function) fetching the three NOAA legs, evaluating `alertMatchesThreshold`-equivalent logic per subscription, sending VAPID-signed pushes with `tag = alertKey`, pruning 404/410 endpoints.
- TTL short (storm traffic: minutes), `aud`/`exp`/`sub` per Apple's strict validation (§5.7).

### 6.4 Honest copy (ships with A)

- Alerts modal footnote: *"Browser alerts fire while the app is open. On Android, install the app for the most reliable alerts. On iPhone, add it to the Home Screen first (Share → Add to Home Screen), open it from the icon, then enable alerts here. Nothing can wake a closed app without a server — this app has none."*
- Empty/no-match state keeps "No alerts at Kp {threshold} or higher right now." plus "As of / Updated" age — never imply overnight coverage.

### 6.5 ADR-0001 amendment proposal (only if B or C is chosen)

> **ADR-0001 amendment (draft):** background alerts are promoted to decision-critical. The app gains one narrowly-scoped backend: a scheduled push sender that (a) stores only `PushSubscription` + Alert threshold + seen `alertKey`s, (b) polls only the public CORS-open NOAA legs, (c) holds no accounts, no location, no analytics. The static contract holds — parsers and query keys are unchanged; the sender reuses `alertKey`/`alertMatchesThreshold` semantics. Data-freshness and "As of" consequences are unchanged; a subscription-lifecycle consequence is added (re-subscribe on launch, prune dead endpoints).

### 6.6 Testing plan (dev vs prod SW, Vitest/Playwright limits)

- **Unit (Vitest, jsdom):** threshold/dedupe/payload builders (`alerts.ts`, `thresholds.ts`, future `push-payload.ts`) — pure, fully covered. Note jsdom has no `Notification`/`PushManager`/SW scope, so handler logic must be factored pure and tested without those globals.
- **SW migration (build):** extend `vite.config.test.ts` seams to assert the `injectManifest` (B) or continued `generateSW` (A) route table, 7-day expiry, and `importScripts` absence/presence; assert `dist/sw.js` contains `push`/`notificationclick` listeners only under B.
- **E2E (Playwright, Chromium-only for SW):** SW inspection (`context.serviceWorkers()`, `serviceworker` event) and offline flows work **only on Chromium** ([Playwright: service workers](https://playwright.dev/docs/service-workers), [Playwright: BrowserContext](https://playwright.dev/docs/api/class-browsercontext)). Assert registration/scope, offline shell, `showNotification` via `registration.getNotifications()` after `grantPermissions(["notifications"])`, and click-through focus/open. Real push delivery is **not** testable in Playwright (incognito contexts lack Push API support; notification-permission behavior is inconsistent across browsers — open feature request with workarounds discussion: [playwright#23954](https://github.com/microsoft/playwright/issues/23954)). Simulate `push` by `worker.evaluate`-dispatched `PushEvent`, and verify title/body/tag/data mapping — never assert OS-level display.
- **Devices:** A ships without device testing beyond existing mobile-layout specs; B requires a real iPhone (16.4+, installed via Home Screen, cable + Web Inspector) and a real Android (installed PWA, engagement-warmed) before any "background alerts work" claim.

---

## Appendix: Sources Audited for This Report

### Standards & specs
- `https://www.w3.org/TR/push-api/` (+ living draft `https://w3c.github.io/push-api/`)
- `https://notifications.spec.whatwg.org/`
- `https://wicg.github.io/periodic-background-sync/`
- `https://datatracker.ietf.org/doc/html/rfc8291/`

### MDN
- `https://developer.mozilla.org/en-US/docs/Web/API/Push_API`
- `https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe`
- `https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/push_event`
- `https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/notificationclick_event`
- `https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API`
- `https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification`
- `https://developer.mozilla.org/en-US/docs/Web/API/Web_Periodic_Background_Synchronization_API`
- `https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API`
- `https://developer.mozilla.org/en-US/docs/Web/API/Background_Fetch_API`
- `https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API`
- `https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage`
- `https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria`
- `https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation`
- `https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Tutorials/js13kGames/Re-engageable_Notifications_Push`

### web.dev / Chrome
- `https://web.dev/articles/push-notifications-how-push-works`
- `https://web.dev/articles/push-notifications-subscribing-a-user`
- `https://web.dev/articles/push-notifications-handling-messages`
- `https://web.dev/articles/push-notifications-web-push-protocol`
- `https://web.dev/articles/sending-messages-with-web-push-libraries`
- `https://web.dev/articles/push-notifications-server-codelab`
- `https://web.dev/explore/notifications`
- `https://developer.chrome.com/docs/capabilities/periodic-background-sync`
- `https://developer.chrome.com/docs/web-platform/notification-triggers`
- `https://developer.chrome.com/blog/timer-throttling-in-chrome-88`
- `https://developer.chrome.com/blog/background_tabs`
- `https://blog.chromium.org/2020/11/tab-throttling-and-more-performance.html`
- `https://developer.chrome.com/docs/workbox/modules/workbox-background-sync`
- `https://developer.chrome.com/docs/workbox/modules/workbox-build/#which-mode-to-use`
- `https://chromestatus.com/feature/5689383275462656`

### WebKit / Apple
- `https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/`
- `https://webkit.org/blog/13966/webkit-features-in-safari-16-4/`
- `https://webkit.org/blog/12945/meet-web-push/`
- `https://webkit.org/blog/16535/meet-declarative-web-push/`
- `https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers`
- `https://developer.apple.com/videos/play/wwdc2022/10098/?time=814`
- `https://developer.apple.com/support/dma-and-apps-in-the-eu/`
- `https://github.com/WebKit/WebKit/commit/b6e8acdb048d8dcee4212c837abe050353284db6`
- `https://github.com/WebKit/WebKit/commit/7ab26d3bede6533ba602077c94c76b6b8070dce3`
- `https://bugs.webkit.org/show_bug.cgi?id=185575`
- `https://github.com/WebKit/WebKit/pull/64432`

### vite-plugin-pwa / Workbox
- `https://vite-pwa-org.netlify.app/guide/inject-manifest`
- `https://vite-pwa-org.netlify.app/workbox/inject-manifest`
- `https://github.com/vite-pwa/vite-plugin-pwa/issues/84`
- `https://github.com/vite-pwa/docs/issues/132`

### Senders (first-party docs)
- `https://firebase.google.com/docs/cloud-messaging/web/get-started`
- `https://docs.ntfy.sh/` + `https://docs.ntfy.sh/subscribe/api/` + `https://docs.ntfy.sh/subscribe/web/` + `https://github.com/binwiederhier/ntfy`
- `https://documentation.onesignal.com/docs/en/web-push-for-ios`
- `https://docs.netlify.com/build/functions/scheduled-functions/`
- `https://supabase.com/docs/guides/functions/schedule-functions` + `https://supabase.com/docs/guides/cron` + `https://supabase.com/docs/guides/functions`

### Compat & testing
- `https://caniuse.com/push-api` + `https://caniuse.com/mdn-api_pushmanager` + `https://caniuse.com/notifications` + `https://caniuse.com/background-sync` + `https://caniuse.com/wf-periodic-background-sync` + `https://caniuse.com/mdn-api_serviceworkerregistration_periodicsync`
- `https://playwright.dev/docs/service-workers` + `https://playwright.dev/docs/api/class-browsercontext` + `https://github.com/microsoft/playwright/issues/23954`

### Local baseline
- `X:\0CODING\React Apps\spaceweather\CONTEXT.md`, `X:\0CODING\React Apps\spaceweather\docs\adr\0001-client-side-only-architecture.md`, `X:\0CODING\React Apps\spaceweather\docs\adr\0006-offline-pwa-and-personal-oval.md`, `X:\0CODING\React Apps\spaceweather\vite.config.ts`, `X:\0CODING\React Apps\spaceweather\public\manifest.json`, `X:\0CODING\React Apps\spaceweather\src\products\alerts.ts`, `X:\0CODING\React Apps\spaceweather\src\products\thresholds.ts`, `X:\0CODING\React Apps\spaceweather\src\components\pages\home\components\Alerts\AlertsContext.tsx`, `X:\0CODING\React Apps\spaceweather\src\components\pages\home\components\Alerts\Alerts.tsx`

---

*Re-verify iOS version gates and the Declarative Web Push convergence before implementation; Apple and Chrome update push behavior without versioning the web.*
