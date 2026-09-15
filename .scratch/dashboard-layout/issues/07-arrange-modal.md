# 07: Arrange modal editing all three buckets

**What to build:** The Dashboard header Arrange dialog that edits every layout bucket without touching the live page mid-edit, so chasers own phone, laptop and wide arrangements. Tabs hold one reorder list per bucket (1-column list, 2-column A/B, 3-column A/B/C) with mouse drag plus up/down buttons and arrow-key moves; Apply persists all buckets and re-renders, Cancel and every dismiss path discard, focus returns to the trigger, and Reset-to-default is included.

**Blocked by:** 01, 04 (needs the split panels and the per-bucket column shape)

**Status:** ready-for-agent

- [ ] Modal opens from the Dashboard header, shows all three bucket tabs, and moves panels between columns plus reorders within columns
- [ ] Mouse drag, button moves and arrow keys all drive the same dialog-only order; the live Dashboard never mutates before Apply
- [ ] Apply persists every bucket and re-renders; Cancel, Escape, backdrop and close discard everything
- [ ] Focus returns to the Arrange trigger and the dialog meets WCAG 2.1 AA naming and focus management
- [ ] Reset-to-default restores the agreed per-bucket defaults
- [ ] Typecheck, unit suite and axe audit stay green
