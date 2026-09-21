# Background push field findings (2026-09-21)

First real-phone verification of the ticket-02 push sender. Result: the
sender is proven correct up to the platform handoff; closed-app delivery
fails on the test phone for OS reasons no sender-side change can reach.
The Alerts modal and the Install & Alerts guide are parked (code kept,
surface commented out) until reliability is proven on friendly phones.

## Test phone

Xiaomi, HyperOS 2.0.12.0, Android 14 (UP1A.231005.007), Chrome
153.0.8010.49. Tested installs from Brave (shortcut install) and from
Chrome (full install). One subscription per install lands in Blobs.

## What was proven working

- Env vars set in the Netlify dashboard; redeploy picks them up.
- All 4 functions live in production: `poll-alerts`, `send-test`,
  `subscribe`, `unsubscribe` (no `netlify.toml` needed — the default
  `netlify/functions` directory is picked up).
- Subscribe flow stores the device: Blobs store `push-subscriptions`
  holds the endpoint (keyed by its SHA-256 digest).
- `send-test` hands pushes to the push service cleanly: logs show
  `[send-test] status=200 … found=true`, ~20 s durations (the held-poke
  delay) and normal memory (~140 MB of 1024 MB).
- Foreground display works: instant test pokes render via the service
  worker's push handler with the app open.

## What fails

With the app closed (Home button, left in recents), the notification
never appears — not in the shade, on Wi-Fi or mobile data, with Chrome
battery Unrestricted and the WebAPK autostarted and unrestricted. It
appears only after reopening the app: the classic queued-redelivery
shape (test TTL is 1 h), i.e. the push service holds the message until
something on the phone wakes up.

## Cause

HyperOS freezes background work, including Google Play services — the
middleman every push travels through. On this phone the battery setting
for Play services is locked by the OS (not adjustable), and the
Autostart list does not even offer Chrome or Play services. Brave
installs are shortcuts without real install plumbing, so they never had
a working background path at all. Urgency was raised to high and a
20-second held test added; neither matters when the OS will not wake
the messenger. This is OS policy, not an implementation bug: even a
fully native app is delivered through the same pipe.

## Tried and ruled out

Reinstall, re-enable, Brave vs Chrome install, Wi-Fi vs mobile data,
Chrome battery Unrestricted, WebAPK autostart + unrestricted, Play
services hunt (setting locked), high-urgency sends, delayed (20 s) test
with lock-and-wait and shade checks while closed.

## Verdict

Background push is best-effort by nature: it should work where the OS
cooperates (Pixel / stock Android / properly installed iPhone /
desktop) and silently fails where it does not (notably Xiaomi/HyperOS
without owner-performed whitelisting surgery). With a single hostile
test phone, no claim about "most phones" can be made, so the feature
stays parked rather than documented as working.

## Parked surface (restore together)

- `src/components/pages/home/Home.tsx`: Alerts button + dialog mount
  (imports, state, trigger, mount all commented).
- `src/components/navigation/Nav.tsx`: Install & Alerts submenu entry.
- `src/components/App.tsx`: `about/install-alerts` route.
- `src/components/pages/About.tsx`: pointer paragraph (heading kept).
- `src/components/PageFooter/documentTitle.ts`: title map entry.
- Tests parked alongside: `Home.dashboard.test.tsx` (3 modal tests),
  `Nav.test.tsx` (submenu lists), `About.test.tsx` (pointer test),
  `documentTitle.test.tsx` (map expectation), `e2e/alerts-a11y.spec.ts`,
  `e2e/install-alerts-a11y.spec.ts`, `e2e/smoke.spec.ts` (submenu list +
  subpage test); `e2e/guide-a11y.spec.ts` Tab count adjusted 3 → 2.
- Untouched and still live: `AlertsProvider` + in-app strip (foreground
  alerts poll every 5 min and notify with the tab open), all of
  `src/push/`, the Netlify functions, the manifest/icons/PWA plumbing.

## Path back

1. Guided onboarding: ask for the whitelisting *at enable time*
   (per-brand autostart/unrestricted steps) instead of discovering the
   failure afterwards.
2. Proof on two or three friendly real phones (Pixel/Samsung + iPhone);
   emulators cannot do push.
3. Unpark the list above, restore the e2e Tab count, and re-verify the
   held-poke test closed-app on each phone.
