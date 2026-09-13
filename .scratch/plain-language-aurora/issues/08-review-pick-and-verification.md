# 08: Wording review pick + verification pass

**What to build:** the human picks P1 or P2 per row (loser deleted, not flagged), then the whole panel is proven shippable — full unit + Playwright + axe + narrow-layout pass with typecheck and build green.

**Background:** prototype ticket 04 frames the comparison; ticket 03 ships both variants in the tables. This ticket closes the voice question and the effort's build.

**Blocked by:** 05 (meters), 06 (sky line).

**Status:** ready-for-agent

- [ ] Human review recorded per row in this file (P1 / P2 / merged per row); losing variants removed from the tables entirely. 2026-09-13: the table half of this already happened in ticket 03's amendment (gate jargon dropped, speed+Bz merged into one `l1IntervalText` sentence, Kp wordings human-tweaked) — this ticket reviews whatever remains plus the full panel
- [ ] Human question answered 2026-09-13: a "towns where it may be visible" UI element does NOT exist and is deliberately out of scope (N11 unverified city strings; ticket 06 says "no city strings", spec's preferred alternative was to skip cities). If wanted, it is a NEW effort whose first ticket verifies city strings live against an official source — record here whether to open that effort or waive it
- [ ] Hallway check with a novice (Q8, soft-maybe): a layman answers "can I see aurora tonight from my place, when/where do I look?" unaided — performed with a willing newcomer if one is at hand, otherwise explicitly waived here with the reason recorded
- [ ] [RE-VERIFY] items from the honesty inventory (ticket 01 Part B: city strings, HP legend wording) re-checked live before ship — unresolved items stay out of shipped copy
- [ ] Playwright Home journey on live-shape fixtures: panel renders, tab keyboard path, daylight-gate states, axe audit clean, narrow-layout pass
- [ ] Full suite green: Vitest + Playwright + typecheck + build
