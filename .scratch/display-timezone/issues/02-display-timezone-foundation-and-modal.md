# 02: Display timezone setting — foundation, Time modal, Local conditions & webcams

**What to build:** The Display timezone setting itself, end to end. A two-state preference — Local (the device zone, the default) or UTC — persisted under a versioned storage entry following the house storage-module pattern, provided app-wide through a small root context so every surface updates live. A single display-time module owns all absolute-time rendering (short absolute strings, chart ticks, tooltips, slot ranges, day labels, day bucketing, Issued lines; relative age stays zone-free). The first live surface is the dashboard freshness lines. The control: a settings-gear button labeled "Time", styled like Astro mode and placed before it, opening a modal with a "Show times in UTC" checkbox plus Apply / Cancel / X / Escape handling and the explanatory note (times follow the device's timezone no matter which place is picked; the UTC-dated tables stay UTC). Local conditions times — hourly strip, luminosity timeline, updated-at — are converted from place-local times and rendered in the Display timezone (the weather contract retains the UTC offset and IANA timezone Open-Meteo already returns; the device zone is authoritative in Local mode, never the geocoded place's clock). The webcam "Loaded" stamp obeys the setting too.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Time button present before Astro mode, styled like it, reachable from the hamburger menu
- [ ] Modal: checkbox unchecked by default; Apply saves and closes; Cancel, X, and backdrop/Escape discard; focus handling matches the alerts modal pattern
- [ ] Choice persists across visits; all wired surfaces update live without reload
- [ ] Dashboard freshness lines render in the chosen zone, with the " UTC" suffix only in UTC mode
- [ ] Relative ages ("just now", "15m ago") read identically in both modes
- [ ] Local conditions hourly strip, luminosity timeline, and updated-at timestamps render in the Display timezone via place-local conversion
- [ ] Webcam "Loaded" stamp obeys the setting
- [ ] Modal explains the device-timezone rule and mentions the UTC-dated tables exception
- [ ] Display-time module unit tests pass with pinned timezone and injected clock: both modes, midnight crossing, place-local conversion with offset
- [ ] Storage module tests cover load, save, default fallback, and invalid stored data
