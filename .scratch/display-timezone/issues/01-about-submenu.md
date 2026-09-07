# 01: About submenu — This site / Sources / Explainers

**What to build:** The About entry in the header becomes a dropdown submenu cloned from the Details submenu pattern (same keyboard and screen reader behavior). It contains three items: **This site** at the existing about route (heading retitled "This site"; the biography and future-plans article stay), **Sources** as a new subpage carrying the Data & Sources article moved wholesale, and **Explainers** keeping its existing route with its link moved from the top level into the submenu.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Header shows an About trigger that opens a submenu with This site, Sources, and Explainers
- [ ] Submenu matches the Details submenu's keyboard handling and accessibility (aria-expanded/haspopup/controls, blur and key handling)
- [ ] This site page shows the biography and future-plans content under a "This site" heading
- [ ] Sources page shows the Data & Sources article with every attribution intact
- [ ] Explainers no longer appears at top level; it remains reachable from the submenu at its existing route
- [ ] Existing navigation tests updated and passing
