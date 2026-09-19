# 07: Install & Alerts About section

**What to build:** a new About entry "Install & Alerts" holding the relocated mobile-install steps plus honest background-alert documentation, serving as the deep-link target for settings failure panels.

**Blocked by:** None (can start immediately, parallel with the sender work).

**Status:** done

- [x] The install steps move out of the This-site page into the new section (with a redirect or link left behind), extended with the Home-Screen step iOS requires for push.
- [x] The section documents what background alerts do and don't do (closed-phone delivery, installed-app requirement on iOS, no silent pokes) and the no-accounts privacy note: exactly the push address, threshold, place, timezone, and gates are stored — no names, no GPS tracking.
- [x] The settings failure panels link here and land on the relevant heading.

## Comments

### Implemented 2026-09-19 (agent, awaiting human review — NOT committed)

TDD seams (confirmed with the user before the first test): the About submenu
destinations (Nav), the new page component's contract, the This-site
pointer, the push-failed panel's link (Alerts), and the document-title map.
Each landed RED first, then minimal GREEN.

**Decisions agreed with the user up front:**

- Route `/about/install-alerts`; the submenu order came from the human:
  This site, Install & Alerts, Aurora guide, Explainers, Sources.
- The push-failed panel links to the install heading
  (`/about/install-alerts#install`); the denied-permission panel keeps its
  browser-settings copy and gets no link (a permission block is not an
  install problem).
- The This-site page keeps the "Install on mobile" h2 with a one-line
  pointer where the steps were (the ticket's "link left behind").

**New/changed modules:**

- `src/components/pages/InstallAlerts.tsx` (new) – the page: the relocated
  Android steps, the new iPhone Home-Screen steps (Safari, Share, Add to
  Home Screen, iOS 16.4+), the do/don't documentation (pokes with the app
  closed, quiet days silent, every poke a visible notification and no
  silent pushes) and the no-accounts privacy note (exactly the push
  address, Alert threshold, stored place with short name and timezone,
  alert type toggles + Live alert gates; no names, no GPS tracking; the
  blind-overwrite trade-off of the unguessable push address stated per the
  spec's About-guide decision). Scrolls to the heading the URL hash names.
- `src/components/pages/useHashScroll.ts` (new) – the one hash-scroll
  owner, extracted at review from the now-three identical effects
  (InstallAlerts + explainers; Home's MutationObserver variant keeps its
  own shape).
- `About.tsx` – the ordered steps moved out; the h2 stays with a pointer
  line to the new section.
- `Alerts.tsx` – the push-failed panel's copy now ends in a link to
  `Install & Alerts` at `#install` (the seam ticket 06 recorded; the copy
  no longer names "the About section").
- `Nav.tsx` / `App.tsx` / `documentTitle.ts` – the fifth submenu
  destination in the human's order, the route, and the
  `Install & Alerts – Space Weather` tab title.
- `Alerts.test.tsx` / `AlertsDialog.test.tsx` – render helpers wrapped in
  MemoryRouter (the new Link needs a router; the app always renders Alerts
  inside one).
- e2e: new `install-alerts-a11y.spec.ts` (axe audit, deep-link landing on
  `#install`, submenu keyboard reach, the This-site handover link, mobile
  overflow); `smoke.spec.ts` gains the route render and the five-label
  submenu check; `guide-a11y.spec.ts` recounts the guide's submenu tab
  position (now third).

**Code review (Standards + Spec sub-agents) – findings fixed or argued:**

- Fixed: the third copy of the hash-scroll effect extracted into
  `useHashScroll`; "on this site's server" reworded ("server" is on the
  Push sender _Avoid_ list); the two unqualified "gates" reads qualified as
  "the Live alert gates"; the blind-overwrite trade-off stated in the
  privacy section (the spec's "this trade-off is stated in the About
  guide" was half-stated); the daily-outlook quiet-day sentence rewritten
  in CONTEXT.md's own rule; the page's Dashboard affordance changed
  `<a href="/">` to `<Link>` and pinned; CONTEXT.md gained the
  `Install & Alerts` term, the updated About submenu destination list, and
  a new `Push address` term (the glossary gap the reviewer flagged: the
  spec says "push address" everywhere, the glossary had no entry).
- Argued (kept deliberately): Try again stays beside the new link on the
  push-failed panel – ticket 06's note said the guide link "replaces" the
  Try-again affordance, but with a granted permission and no subscription
  there is no other re-attempt affordance (the Enable button is gone), so
  removing Try again is the dead end story 16 forbids; the link is the fix
  path, Try again the retry path. The test file header keeps the "TDD RED"
  note (the repo's test-file style, cf. documentTitle.test.tsx). The page's
  "quiet days" copy states ticket 04's agreed threshold-gated rule
  (CONTEXT.md's Daily outlook alert), which supersedes the spec's older
  bare "stays silent on quiet days" wording. An unknown URL hash scrolling
  to nothing matches the explainers behaviour it now shares the hook with.

**Verification:**

- `npm run typecheck` (app + worker programs): clean.
- Full unit suite: 1163/1164 pass. The single failure
  (`ArrangeModal.test.tsx` → "notes on the Pinned webcams row") is
  pre-existing and unrelated (documented in tickets 01–05; re-verified
  this session by stashing the change – fails identically on the pristine
  tree).
- Playwright: install-alerts-a11y (5/5), about-a11y, guide-a11y,
  alerts-a11y, explainers-a11y (16/16 together), smoke.spec.ts (33/33 with
  the new route + submenu tests).
- `vite build`: injectManifest unchanged (20 precache entries).

**Manual human steps:** none new.

### Text pass 2026-09-19 (human's edit)

The human rewrote the page's copy in review; the suite follows it:

- The last section is renamed "Your data", and the privacy note is
  restructured as two lists: what the sender **receives** (push address,
  alert threshold, alert type toggles, live alert settings, stored place
  with short name and timezone) and what it **does not receive**
  (personal information, the device's current location).
- Dropped from the page: the push-sender polling sentence, the "every poke
  a visible notification / no silent pushes" paragraph, and the
  blind-overwrite trade-off paragraph (the human's call; ticket 06's
  spec.md About-guide trade-off requirement now rides in CONTEXT.md's
  `Push address` entry instead of the page copy).
- Agent fixes on top of the human's text, meaning preserved: the lists no
  longer nest inside a `<p>` (invalid HTML); "The server" reads "The
  sender" (the Push sender _Avoid_ list bans "server" when the sender is
  meant); "The push identifier" reads "The push address" (the glossary
  term); the redundant standalone "Your email," bullet dropped ("name,
  email, etc." already carries it); the This-site pointer line now says
  "how your data is handled" to match the section.

**Verification after the text pass:** typecheck clean; InstallAlerts +
About suites green; e2e install-alerts-a11y (axe with the restructured
lists), about-a11y and smoke all pass.
