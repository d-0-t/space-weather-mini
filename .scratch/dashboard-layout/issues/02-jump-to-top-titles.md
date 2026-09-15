# 02: Shared Jump to top plus h1-derived document titles

**What to build:** A shared page-footer Jump to top button plus per-route document titles, so long pages have one honest way back with context restored and every tab names its page. The button hides on short pages without overflow and replaces the per-region webcams adornments; pressing it returns scroll to the top and moves focus to the page h1. Every route sets `{H1} – Space Weather` on location change including back/forward, with no dynamic suffixes.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Footer Jump to top renders only while the page overflows and stays hidden on short pages
- [x] Activation scrolls to top and moves screen-reader and keyboard focus to the h1
- [x] Dashboard, Webcams, Local conditions, each Details page, This site, Sources, Explainers and Aurora guide each show their h1-derived tab text
- [x] Titles update on push, back and forward navigation; Time and Astro state never affect them
- [x] Typecheck, unit suite and axe audit stay green

## Comments

2026-09-15 – Implemented via TDD (red: PageFooter.test.tsx + documentTitle.test.tsx, green, review fixes). New shared PageFooter (src/components/PageFooter/): overflow hook (resize + MutationObserver + rAF, hidden when no overflow), activation scrolls to top and focuses main h1 via tabindex -1 with no outline surprise, named by visible text. Static route title map (`{H1} – Space Weather`, en-dash) in documentTitle.ts + useDocumentTitle on every location change; wired in index.tsx Shell alongside PageFooter. Accommodated the human's Summary selector rename to Time (updated Home.aurora-split + AuroraSummary suites). Adjacent fix to keep the suite green: AuroraNow attribution test now asserts Oval ownership (split follow-through). Verification: tsc clean, 918+ unit tests green (incl. 7 new), 28 + 17 Playwright tests green including axe audits (home, webcams, about, guide, explainers, conditions). Code review: Standards (type-token pairing fixed) + Spec (push/back/forward + Time/Astro invariance tests added). Ready for review – not committed.

2026-09-15 – Human review corrections (not committed): per-region webcams Jump to top links stay – the human restored `webcams.tsx` adornments, so both the section links and the shared footer coexist; the webcams test was reverted to assert the three per-region links. Pinned-webcams auto-refresh defaults to on: `loadPinsAutoRefresh` returns true on missing/corrupt/non-boolean storage with the doc corrected to defaulting to on, and its test now round-trips on/off plus corrupt fallbacks.
