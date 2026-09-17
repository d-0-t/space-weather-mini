# 04: Wide Dashboard buckets with xl breakpoint and landscape exception

**What to build:** The wide responsive shell all later layout work rides on: canonical xl breakpoint at 1600px, Dashboard capped at 1600px with `1fr 2fr` 2-column from md and middle-widest `1fr 2fr 1.5fr` 3-column at xl, per-bucket default column membership for all eight panels, Webcams full-bleed with padding kept, and the landscape-phone exception rendering the normal 2-column reflow. Details and About family widths, table shapes and tokens stay untouched.

**Blocked by:** 01 (needs the four split panels to place)

**Status:** done

- [x] 1-column below md, `1fr 2fr` 2-column from md to below xl, `1fr 2fr 1.5fr` 3-column at xl with the agreed default membership per bucket
- [x] Resizing across a bucket switches to that bucket's defaults immediately and empty columns collapse
- [x] Corrupt storage falls back to defaults and unknown panel ids append rather than vanish
- [x] Webcams uses the full width with page padding; Details, About, Sources, Explainers and Aurora guide stay narrow
- [x] Rotated phones matching landscape plus min-width 670px plus max-height 500px get the standard 2-column reflow while portrait phones stay single column
- [x] Typecheck, unit suite, computed-style specs and axe audit stay green

## Comments

2026-09-16 – Implemented via TDD (red: dashboardLayout.test.ts + Home.wide-buckets.test.tsx + e2e/dashboard-layout.spec.ts, green, review fixes). New Dashboard layout module (src/components/pages/home/dashboardLayout.ts): versioned per-bucket column membership (`sw:dashboard:layout:v1`, 1-column list plus 2-column A/B plus 3-column A/B/C) with the agreed defaults, corrupt/foreign-shape fallback to defaults, missing known panels appended to the last column, unknown future ids preserved in place, and a `useLayoutBucket` hook (md/xl matchMedia plus the raw landscape-phone exception) that switches buckets immediately on resize. Home renders the active bucket's columns verbatim with empty columns collapsed; unknown ids render nothing but stay in storage. Breakpoints gain xl 1600px via `respond-to`; Dashboard caps at 1600px (`1fr` below md, `1fr 2fr` from md, `1fr 2fr 1.5fr` at xl, raw landscape exception first so md/xl win when they also match); Webcams goes full-bleed with padding kept; Details/About family untouched at 800px. New e2e dashboard-layout spec (6 tests: 1/2/3-column, landscape exception, 1600px cap plus Webcams full-bleed, narrow About/Sources). Verification: tsc clean, 938 unit tests green (94 files, incl. 10 new layout + 6 new composition tests), Playwright green (new 6-test layout spec; home-a11y incl. axe, mobile-layout, typography, webcams, conditions-layout, conditions-a11y). Code review: Standards (bucket values renamed to the glossary 1-column/2-column/3-column, dead flow modifier dropped, foreign-shape tests added) + Spec (narrow-family proof extended to Sources, collapse-vs-refill semantics locked by test). Adjacent fix to keep the suite green: OvalGlow heading test asserted the glossary long name while the panel renders the short "Oval glow" (pre-existing red on main, test name already said short) – assertion aligned to the implementation; heading copy decision left to the human (see open questions). `saveDashboardLayout` ships as the tested persistence seam for ticket 07's Arrange modal; the global Compact toggle is held as-is for ticket 05's migration. Ready for review – not committed.

Open questions for the human: (1) Panel heading is "Oval glow" but CONTEXT.md heads it "Oval glow intensity" – rename the panel or amend the glossary? (2) `saveDashboardLayout` is exported for ticket 07 but unwired until the Arrange modal lands – keep or revert? (3) Unknown future ids render nothing while staying in storage – acceptable, or should they surface a placeholder?
