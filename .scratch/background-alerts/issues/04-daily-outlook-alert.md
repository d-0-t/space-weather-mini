# 04: Daily outlook alert — tonight at the stored place

**What to build:** one place-local morning–lunch push per day naming tonight's expected Kp and the darkest window at the stored geocoded place (e.g. "Tonight Kp 4 expected. Darkest at Piteå 22:38–02:23."); silence on quiet days; tomorrow night's outlook once past dawn.

**Blocked by:** 02 (Push foundation).

**Status:** ready-for-agent

- [ ] The outlook uses the Kp forecast plus the same darkest-window computation as the app, rendered in the stored place's timezone with the place short name in the copy.
- [ ] Nothing is sent when no threshold-relevant activity is forecast (no "nothing tonight" pokes).
- [ ] After local dawn the outlook describes the coming night, never the one just past.
- [ ] A phone offline at send time receives the newest outlook on reconnect (day-scale time-to-live, collapse by event key — never a flood of stale days).
