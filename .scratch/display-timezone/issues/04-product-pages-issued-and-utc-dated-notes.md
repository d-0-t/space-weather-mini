# 04: Forecast product pages — one Issued line + UTC-dated notes

**What to build:** Each forecast product page (Forecast discussion, 3-day forecast, Weekly report, 27-day outlook, Daily geomagnetic indices, Geophysical alert) collapses its header to a single rendered Issued line in the Display timezone — labeled "Issued (UTC)" in UTC mode, plain "Issued" in Local mode. The verbatim NOAA text inside product bodies is untouched. The 27-day outlook and Daily geomagnetic indices keep their UTC date cells in both modes (each row aggregates one NOAA UTC day) and show a short muted note above the table only while Local is chosen.

**Blocked by:** 02 (Display timezone setting — foundation, Time modal, Local conditions & webcams).

**Status:** ready-for-agent

- [ ] Every product page shows exactly one Issued line, rendered in the chosen timezone
- [ ] Verbatim NOAA product body text is unchanged
- [ ] UTC-dated tables keep UTC date cells in both modes
- [ ] The note above each UTC-dated table appears only in Local mode and is absent in UTC mode
- [ ] Product page tests updated to assert both modes
