# 02: Region filter chips + Hidden sources dialog

**What to build:** Region filtering over the whole gallery using native checkbox chips with swift Show all / Hide all toggles, and per-source hiding (any source type) with a restore dialog showing a live hidden count, both persisted across visits.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] A chip row above the gallery: one native checkbox per region present in the registry (Scandinavia, Alaska, Canada, US, Antarctica, Australia, New Zealand, UK, Greenland, Russia — fixed display order, absent regions don't render); checking one or more chips narrows image cards *and* link rows to those regions; zero checked shows everything; chip state is announced natively by the checkbox
- [ ] **Show all** and **Hide all** native buttons beside the chips toggle every chip at once (Show all clears them; Hide all checks them all, leaving an honest empty state — "No webcams match your filters"); neither button affects the individually hidden sources, and the hidden set stays untouched by either action
- [ ] Any source — image card, Twitch card, or link row — can be hidden; a hidden item leaves the gallery under every filter and its image is no longer fetched
- [ ] Hidden sources persist in versioned local storage and stay hidden across visits and re-renders
- [ ] A "Hidden sources (N)" native button — the count kept live in the label, e.g. "Hidden sources (18)" — opens the Hidden sources dialog (native dialog semantics — focus management, Esc to close, return focus) listing hidden entries with one-tap restore and a show-all affordance
- [ ] Tests: checkbox chip filtering (checked state asserted natively), Show all / Hide all toggle every chip without touching the hidden set, hide writes storage and removes the item, dialog lists/counts/restores, hidden items survive a re-render; typecheck, build and the unit suite are green