# 05: Contract — delete the superseded formatters

**What to build:** The expand–contract close for the display-time module: after the dashboard, product pages, and Local conditions/webcams migrations land, the old scattered formatting helpers and duplicated month-name tables are deleted so that all absolute-time rendering funnels through the single display-time module. No user-visible behavior change beyond what the earlier tickets delivered; the full suite stays green.

**Blocked by:** 02 (foundation & modal), 03 (Dashboard under one clock), 04 (product pages).

**Status:** ready-for-agent

- [ ] No component formats an absolute time outside the display-time module
- [ ] Superseded helpers and duplicated month-name code are deleted, not just unused
- [ ] Full test suite passes with no behavior change
