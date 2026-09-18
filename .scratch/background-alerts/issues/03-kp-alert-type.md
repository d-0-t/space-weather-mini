# 03: Kp alert type — observed 3-hour value plus 24h forecast

**What to build:** background pokes when the official 3-hour Kp value or the Kp forecast breaches the chaser's Alert threshold, each honestly labeled observed vs predicted, re-poking on escalation only.

**Blocked by:** 02 (Push foundation).

**Status:** ready-for-agent

- [ ] A breach on either leg (observed 3-hour value, forecast within 24h) sends one poke per event, labeled so observed and predicted can never be confused.
- [ ] A rising Kp for the same event re-pokes once per escalation step; an unchanged or easing event stays silent while the in-app strip still updates.
- [ ] Events are deduped by the existing product/issue-datetime key family; a repeat poll without change sends nothing.
- [ ] Scenario tests cover breach, escalation, repeat-poll silence, and below-threshold quiet over canned NOAA payloads.
