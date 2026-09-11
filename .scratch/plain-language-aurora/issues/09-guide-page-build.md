# 09: Guide page build ("Guide" at /about/guide)

**What to build:** the narrative aurora guide as specified in `guide-spec.md` — five experience-voiced sections (what / latitude-aware when + where / sky caveats / traveler aids), a "Guide" entry in the About submenu, and one link from the interpreter panel header — so a layman or traveler gets the whole evening in one read-through.

**Background:** outline, boundary, IA and aids depth decided in ticket 01 Part D; honesty bounds in Part B (Tips-band quoting with caveats, no verified-city strings, no color promises, moon/daylight caveats). Terms go through the shared term component (popups if ticket 07 landed, links otherwise).

**Blocked by:** 03 (the panel-header link needs the panel to exist; page + submenu themselves are independent).

**Status:** ready-for-agent

- [ ] Route `/about/guide` renders the five sections in order with the decided voice; where-to-look is latitude-aware and defers live position to the view-distance band + oval via links
- [ ] About submenu gains the "Guide" entry with the existing submenu keyboard/a11y behavior; interpreter panel header links to the guide once
- [ ] Component smoke (headings order, key copy) + Playwright journey (route, keyboard walk, axe audit, narrow layout); typecheck + Vitest green
