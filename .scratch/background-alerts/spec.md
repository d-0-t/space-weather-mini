# Background-running alerts (push sender + three alert types)

Status: ready-for-agent

## Problem Statement

Aurora chasers carry the phone in their pocket, not the app on screen. Today alerts only fire while a tab is open: close the browser and a Kp breach, a storm onset, or the night's best dark window all pass silently. Mobile operating systems freeze background tabs and iOS evicts idle site data, so no pure-client trick can wake a closed phone — every working path needs a small sender that stays awake on the chaser's behalf.

## Solution

Add a tiny push sender that lives in this repo and deploys with the existing Netlify site: scheduled runs poll the same NOAA feeds the app already reads, evaluate each stored push subscription against the chaser's own alert settings, and fan out Web Push pokes that Apple/Google deliver even with the app closed. No accounts — the push address is the identity — and three distinct alert types the chaser toggles independently: a daily outlook, a Kp threshold alert, and a live summary-word alert gated by per-hindrance settings at the stored geocoded place.

## User Stories

1. As a chaser with my phone in my pocket, I want a poke when the official 3-hour Kp value breaches my Alert threshold, so that I don't miss a storm that started while the app was closed.
2. As a chaser, I want a poke when the Kp forecast predicts a breach of my threshold in the next 24h, honestly labeled as predicted rather than observed, so that I can plan the evening.
3. As a chaser, I want a second poke only when the storm escalates to a higher Kp, not a repeat every poll for the same event, so that I trust each poke.
4. As a chaser, I want one daily outlook push naming tonight's expected Kp and the darkest window at my stored place (e.g. "Tonight Kp 4 expected. Darkest at Piteå 22:38–02:23."), so that I get one glanceable plan per day.
5. As a chaser, I want no daily push on quiet days, so that I never learn to mute the app.
6. As a chaser who checks the app after sunrise, I want the daily outlook to describe tomorrow night instead of the night just past, so that it is never stale.
7. As a chaser, I want a live alert when the Summary's shared verdict word turns favorable at my stored place, as its own alert type separate from the Kp number, so that field coupling (solar wind, hemispheric power) is reflected, not just the planetary index.
8. As a chaser under clouds, I want the live alert withheld when cloud cover at my place exceeds my own limit, so that I am not dragged out for an invisible sky.
9. As a chaser, I want to set my own cloud limit as a percentage, so that a chaser under thin high cloud and one under marine stratus can choose differently.
10. As a chaser, I want the live alert withheld while it precipitates at my place (toggleable), so that rain nights stay silent.
11. As a chaser, I want to pick how dark it must be — Night, Astronomical Twilight, Nautical Twilight, or Any (including daytime) — so that midnight-sun and city chasers each get honest behavior.
12. As a chaser, I want every hindrance label to name my stored place ("Cloud at Piteå"), so that I always know which sky is being judged.
13. As a chaser who doesn't know what Kp 5 means, I want an info popup next to the threshold slider explaining the 0–9 scale and its G1–G5 mapping, so that the number is a choice, not a guess.
14. As a chaser, I want a one-line tip naming my stored place and the Kp that typically brings the oval to it (approximate geomagnetic latitude, Tips rule, never a promise), so that my threshold starts from something personal.
15. As a mobile chaser, I want install guidance visible without hunting (not behind a disabled button), so that I learn the Home-Screen step that iOS requires for push.
16. As an iPhone chaser in a plain Safari tab, I want tapping Enable to attempt subscribing and, on failure, route me to the Install & Alerts guide, so that there are no dead ends and no platform-sniffing surprises.
17. As a chaser who moves towns, I want my stored place, timezone, threshold, and gates synced to the sender on every change, so that background alerts follow the same place the Dashboard shows.
18. As a privacy-minded chaser, I want to know exactly what the sender remembers (push address, threshold, place, timezone, gates — no names, no accounts, no GPS tracking), so that opting in is an informed choice.
19. As a chaser whose phone was offline half the day, I want missed daily/forecast pokes to arrive on reconnect (newest only, never a flood) and stale live pokes to die quietly, so that I miss nothing important and nothing stale.
20. As a chaser tapping a notification, I want the app to open at the alerts view for that event, so that the poke lands somewhere, not on a cold start.
21. As a chaser, I want to turn each alert type off independently and to forget my push address entirely on disable, so that silence is always one tap away.
22. As the maintainer, I want Netlify-only deploys with the dead static mirror removed, so that background alerts cannot silently not-work on one URL.
23. As the maintainer, I want the sender's storage behind a 3-method seam starting on Netlify Blobs, so that a future move to Postgres touches nothing else.
24. As the maintainer, I want every manual setup step (VAPID keys, env vars, real-phone checks) written down in the tickets, so that nothing lives only in someone's head.

## Implementation Decisions

- **Same repo, Netlify-only**: the sender is scheduled + HTTP functions beside the SPA; the gh-pages deploy is deleted (ticket 01) so there is exactly one URL where alerts work.
- **No accounts**: the push subscription endpoint is the identity. Enable and every settings change POST the full settings object (subscription, Alert threshold, stored place lat/lon + short name, place timezone, three type toggles, hindrance gates); disable DELETEs it. Overwrites are blind; the endpoint URL is unguessable in practice and this trade-off is stated in the About guide.
- **Three alert types, never conflated**: the Kp alert speaks in Kp numbers (official 3-hour value + 24h forecast, labeled observed vs predicted); the live alert speaks the Summary's shared verdict word computed by the same pure grading functions the app imports (one seam, improvements propagate); the daily outlook speaks Kp forecast + darkest window. Kp numbers and verdict words are never mixed in either copy or logic.
- **Trigger rules**: Kp alert pokes on breach of either leg and re-pokes on escalation only; daily sends once per place-local day in the morning–lunch window and stays silent on quiet days; live fires on a favorable shared word with all enabled hindrance gates passing.
- **Hindrance gates (each individually toggleable, all default on)**: cloud cover under the chaser's own percentage (default under 50%), no precipitation, darkness at or darker than the chosen band (default Astronomical Twilight; options Night, Astronomical Twilight, Nautical Twilight, Any including daytime — Twilight always spelled out). Cloud/precipitation evaluated from the same Open-Meteo contract the Local conditions view uses; darkness from the same darkest-window computation; every label carries the stored place short name.
- **Dedupe**: the existing product/issue-datetime key family identifies events; escalation re-pokes move the key forward. Push collapse tags carry the key so repeats replace rather than stack.
- **Catch-up**: daily/forecast pushes carry a ~12h time-to-live, live pushes ~1h; a reconnecting phone receives the newest only.
- **Service worker**: migrate the PWA plugin from build-time generated worker to an owned worker module with push (show notification inside the wait-until chain, every push visible — silent pushes risk platform revocation) and notification-tap (close, focus or open the alerts view) handlers.
- **Permission flow**: keep the tap-gated permission request; the Enable button always attempts; failures route to the new Install & Alerts guide. Install hint is shown to all mobile users, never a disabled button.
- **About**: new "Install & Alerts" entry holding the moved install steps, what background alerts do and don't do, the no-accounts privacy note (stored place + threshold honesty), and the failure-panel deep link.
- **ADRs**: amend the client-side-only ADR with the push-sender exception it already anticipates, and record the Blobs-now-Postgres-later decision.
- **Manual steps (human, ~5 min, once)**: generate the VAPID pair locally (private key never committed), set the VAPID + contact env vars in the Netlify dashboard, and verify once each on a real iPhone (Home-Screen installed) and Android. No paid accounts anywhere — Apple Developer Program and Firebase are not needed. Blobs provisioning and the poll schedule come from code on push.

## Testing Decisions

- Test external behavior, not implementation: parsers and graders get pure-function unit tests (same style as the existing product test suites); matching/dedupe/escalation get scenario tests over canned NOAA payloads (breach, escalation, repeat poll, quiet day, stale live event); endpoints get contract tests for subscribe-overwrite, disable-forget, and dead-subscription pruning on gone-responses.
- Reuse the highest seams: the shared grading, darkest-window, and reach-edge functions are tested once and imported by both app and sender — never forked copies with parallel tests.
- Push delivery itself is verified manually on real devices (emulators cannot do push); the manual checklist lives in the foundation ticket, and automated tests stop at the send call boundary.
- Accessibility and vocabulary rules from the coding standards apply to all new UI (threshold explainer, gates, guide): native controls, visible focus, CONTEXT.md terms.

## Out of Scope

- Quiet hours / do-not-disturb scheduling (the user mutes the phone; follow-up settings screen).
- Full three-signal fusion tuning beyond reusing the shared word as-is.
- Per-town promises or percentages; reach stays ordinal and approximate.
- Accounts, email/SMS channels, or any third-party pusher SDK.
- Postgres migration (seam only, cut over later if Blobs outgrows).

## Further Notes

- Research backing this spec: the PWA background-alerts brief in the research docs (2026-09-18), including the iOS Home-Screen gate, the VAPID/backend requirement, and the retirement of Notification Triggers.
- The Kp explainer popup and latitude tip reuse the glossary Kp entry and the Tips reach edge; the tip names the stored place short name with a generic fallback when no place is stored.
