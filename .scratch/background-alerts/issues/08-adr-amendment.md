# 08: ADR amendment — push-sender exception to client-side-only

**What to build:** the architecture record honestly reflects the backend: the client-side-only ADR gains the push-sender exception it already anticipated, and the storage-seam decision is recorded.

**Blocked by:** 03 (Kp alert type), 04 (Daily outlook alert), 05 (Live summary-word alert).

**Status:** done

- [x] The client-side-only ADR is amended: app stays static and reads NOAA directly; the push sender (scheduled poll + subscriptions + fan-out) is the named, justified exception.
- [x] A short decision record captures Blobs-now-Postgres-later: the seam, the trigger for migrating, and what stays untouched on migration day.
- [x] No stale "no backend" claim remains in the amended ADR, the README statement, or the research brief's tension notes.

## Comments

### Implemented 2026-09-19 (agent, awaiting human review — NOT committed)

TDD seam (agreed with user): a docs-contract test at the repo root
(`push-sender-adr.test.ts`, same precedent as `deploy-target.test.ts`)
pinning (a) ADR-0001 naming the push sender as the exception, (b) a new
ADR-0012 recording the Blobs-now-Postgres-later seam/trigger/untouched,
and (c) no stale "No backend" claim in the README or the four research
briefs. RED: 8 failing of 10 against the unamended docs; GREEN: 10/10
after the edits.

**Changed:**

- `docs/adr/0001-client-side-only-architecture.md`: amended 2026-09-19.
  Static SPA reading `services.swpc.noaa.gov` directly stays the rule;
  the push sender is the named, justified exception (scheduled poll +
  subscribe/unsubscribe/test endpoints + fan-out, push address as
  identity, blind overwrites, no accounts). Why reworded so the display
  stays informational while alerts are decision-critical; new
  subscription-lifecycle consequence; storage points at ADR-0012.
- `docs/adr/0012-push-sender-storage.md` (new): Blobs now, Postgres
  later. Records the 3-method seam (save / load-all / remove), the
  digest-keyed Blobs records, the migration trigger (scale or query
  need), and what stays untouched on migration day (poll, fan-out,
  handlers, client, record shape, blind-overwrite rule).
- `README.md`: Stack line no longer claims "No backend"; names the
  static SPA plus the one push sender (ADR-0001 exception, ADR-0012).
- Research briefs (user chose "update all"): constraint lines in
  `aurora-chaser-features-2026-08-25`, `webcam-sources-2026-08-29`,
  `aurora-local-conditions-2026-09-01` and `pwa-background-alerts-2026-09-18`
  now carry the push-sender exception; the pwa brief's §6.5 draft became
  the landed amendment with an implemented banner; pre-decision tension
  notes (§6.4 footnote, §3.3, verdict tables) and the chaser brief's
  foreground-era lines are annotated as superseded, history preserved.

**Code review (Standards + Spec sub-agents) — all findings fixed:**

- Standards: test-file comments renamed off "backend" onto "push
  sender" per CONTEXT.md Avoid list; docs use glossary terms
  throughout; em dashes stay in markdown only (en-dash test covers
  code).
- Spec: ADR-0001 Why contradiction resolved (display informational,
  alerts decision-critical); ADR-0012 identity-vs-key wording fixed
  (identity is the push address, storage key its digest); README seam
  wording fixed; stale body claims annotated rather than left bare.
  Scope notes: the all-briefs rewrite and the contract test were
  explicitly agreed with the user; SHA-256/corrupt-skip lines record
  the seam as built (ticket 02), not new design.

**Verification:**

- `npm run typecheck` (app + worker programs): clean.
- `push-sender-adr.test.ts`: 10/10 pass; en-dash, deploy-target,
  vite.config suites pass.
- Full unit suite: 1171 passed, 3 failed — all 3 fail identically on
  the pristine tree (verified by stashing): 2× `InstallAlerts.test.tsx`
  ("Your data" vs shipped "My data", ticket-07 text drift) and 1×
  `ArrangeModal.test.tsx` (Pinned webcams row link name, documented in
  tickets 01–07). Zero new failures from this ticket.
- No e2e impact (docs-only change); `vite build` untouched.

**Manual human steps:** none — docs-only ticket. Delivery checks ride
ticket 02's real-phone checklist whenever the sender is next deployed.
