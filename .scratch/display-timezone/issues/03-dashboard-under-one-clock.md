# 03: Dashboard under one clock

**What to build:** Every timestamp on the Dashboard renders in the Display timezone. Chart axes and hover tooltips (Solar wind, Magnetosphere, Forecast Kp chart), the Aurora Now current 3-hour window chip and its forecast-time line, the alerts feed timestamps, the Forecast mini-table's day grouping, and the 3-hour slot rows all convert. "Today" becomes the Display timezone's calendar day; a slot straddling midnight is filed under the day its start falls in; the current-slot highlight stays instant-based and does not move between modes. The live banner's raw unformatted timestamps are replaced with the shared formatter (bug fix riding along). In UTC mode the dashboard looks like today's display plus consistent suffixes.

**Blocked by:** 02 (Display timezone setting — foundation, Time modal, Local conditions & webcams).

**Status:** ready-for-agent

- [ ] Chart axes and tooltips show the device clock in Local mode and UTC in UTC mode
- [ ] Aurora Now's current 3-hour window and forecast-time line follow the chosen timezone; the highlight picks the same slot in both modes
- [ ] Alerts feed timestamps obey the setting
- [ ] Forecast mini-table groups rows by Display-timezone day; the straddling slot lands on its start day
- [ ] 3-hour slot rows are labeled in the chosen timezone
- [ ] Live banner shows formatted timestamps in the chosen zone — no raw time tags anywhere
- [ ] " UTC" suffix appears only in UTC mode
- [ ] Dashboard component tests updated to assert both modes
