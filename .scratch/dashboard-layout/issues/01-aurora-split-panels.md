# 01: Aurora split into four Dashboard panels

**What to build:** Split the Aurora now bundle into four sibling Dashboard panels so each story scans and collapses independently: Aurora now keeps Kp numbers, View distance line with place picker, attribution and Moon badge; Summary owns the Interpreter paragraph with time-ahead selector, As-of line and Aurora guide link; Oval glow intensity owns forecast time, glow table, color-blind toggle, map, legend and full-size view; Possible locations owns the Reach towns list under its new heading with unchanged eligibility and ranking. Guide deep-links to the Oval and View distance anchors keep landing.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human

- [x] Dashboard shows Aurora now, Summary, Oval glow intensity and Possible locations as separate collapsible panels with h2 headings in the agreed 1-column default order
- [x] Summary keeps time-ahead selector, As-of line, Moon caveat, reach sentence and guide link with no copy lost
- [x] Oval panel keeps forecast time, table disclosure, color-blind toggle, canvas, legend and full-size view working together
- [x] Possible locations keeps Possible/Likely/Very likely ranking and eligibility rules unchanged
- [x] Guide links and bookmarks to the Oval and View distance anchors land on the moved panels
- [x] Typecheck, unit suite and axe audit stay green

## Comments

2026-09-15 – Implemented via TDD (red: Home.aurora-split.test.tsx, green, review fixes). Aurora now keeps Kp numbers, View distance line with place picker, attribution and Moon badge. New sibling panels: SummaryPanel, OvalGlowPanel, PossibleLocationsPanel (new files under AuroraNow/), sharing the existing OVATION/Kp/solar-wind/Reach-towns query keys so TanStack Query dedupes to one fetch per feed. Columns concatenate to the 1-column default order (col1 Aurora now, Pinned webcams, Summary, Oval glow intensity; col2 Possible locations, Solar wind, Magnetosphere, Forecast); per-bucket membership stays ticket 04's job. Reach towns selection extracted to useReachTowns so the panel shell and rows share one selection; the Possible locations panel renders nothing when no town qualifies. Inner duplicate h3s removed (Summary label is a span, Oval/Reach inner sections are divs). Verification: tsc clean, 912 unit tests green (89 files), 83 Playwright tests green including axe audits and Guide deep-links. Ready for review – not committed.
