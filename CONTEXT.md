# Space Weather Display

A client-side web app that presents NOAA SWPC space weather products — forecasts, indices, and alerts — as an accessible, explainable display.

## Language

### Products

**Space weather product**:
A data source published by NOAA SWPC that the app fetches and displays: the forecast discussion, 3-day forecast, weekly report, 27-day outlook, daily geomagnetic indices, or geophysical alert.
_Avoid_: feed, data file, text file

**Forecast discussion**:
NOAA's narrative forecast for the next 1–3 days, in four sections: Solar Activity, Energetic Particle, Solar Wind, and Geospace.
_Avoid_: discussion.txt

**3-day forecast**:
NOAA's structured forecast of geomagnetic activity, solar radiation storms, and radio blackouts over the next three days; each section has a probability table and a rationale.
_Avoid_: 3day, three day report

**Weekly report**:
NOAA's weekly narrative summary, with Highlights and Forecast sections.
_Avoid_: weekly.txt

**27-day outlook**:
NOAA's tabular outlook of radio flux, planetary A index, and largest Kp index for the next 27 days.
_Avoid_: 27days, 27-day forecast

**Daily geomagnetic indices**:
NOAA's table of observed Kp and A indices for the last 30 days, per station (Fredericksburg middle-latitude, College high-latitude, estimated planetary).
_Avoid_: DGD, daily indices

**Geophysical alert**:
NOAA's alert message covering solar X-ray, energetic-particle, and geomagnetic conditions, with observations and predictions.
_Avoid_: GeoAlert, wwv (internal names only)

### Phenomena

**Geospace**:
The near-Earth space environment — magnetosphere, ionosphere, radiation belts. Also the fourth section of the forecast discussion.
_Avoid_: geospace as a synonym for geomagnetic activity

**Geomagnetic activity**:
Disturbance of Earth's magnetic field, measured by the Kp and A indices. The first section of the 3-day forecast.
_Avoid_: geomagnetism; geospace when geomagnetic is meant

**Aurora forecast**:
The OVATION 30-minute aurora images for the north and south polar regions.
_Avoid_: aurora images, aurora map

### Measures

**Kp index**:
The planetary geomagnetic activity index on a 0–9 scale (0 quiet, 9 extreme storm). The `kp01`–`kp9` CSS classes are its presentation, not its name.
_Avoid_: K-index, Kp value

**A index**:
The daily planetary geomagnetic index derived from Kp.
_Avoid_: Ap index (when the daily planetary A index is meant)

**Radio flux**:
Solar radio flux at 10.7 cm wavelength, a solar activity proxy.
_Avoid_: solar flux, SFU

### Storm scales

**Solar radiation storm**:
An S1–S5 scale event of elevated energetic particles.

**Radio blackout**:
An R1–R5 scale event of X-ray flares disrupting HF radio.

### Sections

**Rationale**:
The concluding prose of each 3-day forecast section, explaining the forecast in the forecaster's words.
_Avoid_: regional text, regionale (the product carries no per-region prose)