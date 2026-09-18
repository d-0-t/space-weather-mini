# 02: Push foundation — owned worker, subscribe plumbing, scheduled poll

**What to build:** an installed chaser can enable browser alerts and the sender remembers the subscription; a test poke arrives with tap-to-open. The scheduled NOAA poll runs every few minutes against the stored subscriptions (matching logic for the three types lands in later tickets).

**Blocked by:** 01 (Remove gh-pages deploy).

**Status:** ready-for-agent

- [ ] Enabling alerts requests permission on tap, creates the push subscription with the app-server key, and stores the full settings object (subscription, Alert threshold, stored place + short name, place timezone, type toggles, hindrance gates); changing any setting re-sends and overwrites; disabling deletes the subscription.
- [ ] Subscription storage sits behind a 3-method seam (save / load-all / remove) starting on the built-in Netlify key-value store, so a future Postgres move touches nothing else.
- [ ] The service worker is owned by the repo (migrated off the generated worker) with push (always shows a visible notification inside the wait-until chain) and tap (closes, focuses or opens the alerts view) handlers.
- [ ] A manual test control fires one canned poke end to end on a real installed phone.
- [ ] Dead subscriptions are pruned when the push service reports them gone.
- [ ] Manual human steps (checklist in the ticket comments when done): VAPID pair generated locally with the private key never committed; VAPID + contact env vars set in the Netlify dashboard; verified once each on a real Home-Screen-installed iPhone and Android.
