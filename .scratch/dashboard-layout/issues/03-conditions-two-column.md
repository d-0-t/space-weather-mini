# 03: Local conditions 2-column with split 3-day weather forecast

**What to build:** A wide 2-column Local conditions layout with the daily table promoted to its own section, so planning reads side by side on desktop and stacks honestly on phones. At lg and above the left column holds Today's daylight plus External maps and the right column holds Weather (current plus hourly with fetched-at timestamp) plus the new 3-day weather forecast section owning the daily table as-is; below lg the stack is daylight, weather, 3-day, external maps.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Wide viewports show daylight plus external maps left and weather plus 3-day weather forecast right at equal halves
- [ ] The 3-day weather forecast is its own collapsible section with its own heading, collapses and anchors independently, table shape unchanged
- [ ] Weather keeps current plus hourly, fetched-at line and Open-Meteo attribution; nothing duplicates
- [ ] Mobile stacks daylight, weather, 3-day, external maps with no horizontal overflow
- [ ] Typecheck, unit suite and axe audit stay green
