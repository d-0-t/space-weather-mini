/**
 * The single source of the app's plain-language glossary.
 *
 * Headings and body copy use the exact terms from CONTEXT.md; avoided
 * synonyms never appear (see CONTEXT.md _Avoid_ lists). The Explainers page
 * renders every entry, and inline GlossaryTerm popups render the same entry
 * verbatim, so a definition is never forked.
 */
export interface GlossaryEntry {
  /** Anchor id on the Explainers page, e.g. "kp-index". */
  id: string;
  /** Visible heading – must match the CONTEXT.md term verbatim. */
  title: string;
  /** Plain-language definition. */
  body: string;
}

/** Every glossary entry, in the order the Explainers page renders them. */
export const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  {
    id: "kp-index",
    title: "Kp index",
    body: "The Kp index is the planetary geomagnetic activity index on a 0–9 scale (0 quiet, 9 extreme storm). It summarises how disturbed Earth’s magnetic field is at mid-latitudes, derived from ground magnetometers around the world. In the app the kp01–kp9 colour classes are only the presentation – the name is always “Kp index”.",
  },
  {
    id: "a-index",
    title: "A index",
    body: "The A index is the daily planetary geomagnetic index derived from Kp. It compresses the eight 3-hour Kp values of a day into a single daily number for long-term comparison. Lower is quieter; high values flag disturbed days.",
  },
  {
    id: "radio-flux",
    title: "Radio flux",
    body: "Radio flux is solar radio flux at 10.7 cm wavelength, a solar activity proxy measured in solar flux units. Higher radio flux means more active sunspots and stronger solar output; it tracks solar activity over the 11-year cycle.",
  },
  {
    id: "geomagnetic-activity",
    title: "Geomagnetic activity",
    body: "Geomagnetic activity is the disturbance of Earth’s magnetic field, measured by the Kp and A indices. It is the first section of the 3-day forecast and tells you whether a geomagnetic storm is expected.",
  },
  {
    id: "geospace",
    title: "Geospace",
    body: "Geospace is the near-Earth space environment – magnetosphere, ionosphere, radiation belts. It is also the name of the fourth section of the forecast discussion; the word is never used as a synonym for geomagnetic activity.",
  },
  {
    id: "solar-radiation-storm",
    title: "Solar radiation storm",
    body: "A solar radiation storm is an S1–S5 scale event of elevated energetic particles that can affect satellites, astronauts, and high-altitude flights. S1 is minor, S5 is extreme. The scale comes from NOAA’s solar radiation storm scale.",
  },
  {
    id: "radio-blackout",
    title: "Radio blackout",
    body: "A radio blackout is an R1–R5 scale event of X-ray flares disrupting HF radio. The burst of X-rays ionises the dayside ionosphere and weakens short-wave communication. R1 is minor, R5 is extreme.",
  },
  {
    id: "aurora-forecast",
    title: "Aurora forecast",
    body: "The aurora forecast shows the OVATION 30-minute aurora images for the north and south polar regions. Green bands near the poles mean a higher chance of visible aurora if skies are dark and clear.",
  },
  {
    id: "interplanetary-magnetic-field",
    title: "Interplanetary magnetic field (IMF)",
    body: "The interplanetary magnetic field is the Sun’s magnetic field carried through space by the solar wind. Its overall strength is Bt, and its north–south component is Bz (GSM) – the part that decides how well the field can link with Earth’s own and let aurora begin.",
  },
  {
    id: "bz-gsm",
    title: "Bz (GSM)",
    body: "Bz (GSM) is the north–south component of the interplanetary magnetic field in nT, in GSM coordinates. Southward (negative) Bz lets the solar wind couple to Earth’s magnetic field; northward (positive) Bz mostly keeps the gate closed. How long Bz stays southward matters more than a single reading.",
  },
  {
    id: "hemispheric-power",
    title: "Hemispheric power",
    body: "Hemispheric power is an estimate of the total auroral particle energy arriving over one hemisphere, in gigawatts, derived from the OVATION model. Higher values mean more energy is being deposited into the aurora; roughly 50 GW and up is when aurora tends to be observable with motion, and about 60 GW is the physics-backed G1 neighborhood. The model explains only about half the variance, so it is an indicator, not a promise.",
  },
  {
    id: "dst-index",
    title: "Dst index",
    body: "The Dst index is an hourly equatorial measure of how disturbed Earth’s magnetic field is, in nT. Negative values mean a geomagnetic storm is under way and the ring current has strengthened. It is a storm characterizer, not a viewing forecast for your sky.",
  },
  {
    id: "offline-pwa",
    title: "Offline (PWA)",
    body: "The app opens without internet after you have visited once while online: the app shell and the last fetched NOAA products are saved on your device by the Service Worker. When the network is unreachable every live card shows the last data with `As of` and its age plus “⚠ Showing saved data – couldn't reach NOAA”; if nothing was ever fetched it shows “Couldn't load – connect to refresh”. No data is invented. Your first visit must be online, and on iOS the saved copy may be removed after 7 days without launching the app.",
  },
  {
    id: "space-weather-product",
    title: "Space weather product",
    body: "A space weather product is a data source published by NOAA SWPC that the app fetches and displays: the forecast discussion, 3-day forecast, weekly report, 27-day outlook, daily geomagnetic indices, or geophysical alert. Each product covers a different time span and measure.",
  },
  {
    id: "forecast-discussion",
    title: "Forecast discussion",
    body: "The forecast discussion is NOAA’s narrative forecast for the next 1–3 days, in four sections: Solar Activity, Energetic Particle, Solar Wind, and Geospace. Each section opens with a day summary of the past 24 hours and then gives the forecast.",
  },
  {
    id: "3-day-forecast",
    title: "3-day forecast",
    body: "The 3-day forecast is NOAA’s structured forecast of geomagnetic activity, solar radiation storms, and radio blackouts over the next three days. Each section has a probability table and a rationale paragraph explaining the forecaster’s reasoning.",
  },
  {
    id: "weekly-report",
    title: "Weekly report",
    body: "The weekly report is NOAA’s weekly narrative summary, with Highlights and Forecast sections. Highlights recaps the past week’s solar and geomagnetic activity; Forecast looks ahead to the next 27 days.",
  },
  {
    id: "27-day-outlook",
    title: "27-day outlook",
    body: "The 27-day outlook is NOAA’s tabular outlook of radio flux, planetary A index, and largest Kp index for the next 27 days. It gives a month-long view of expected solar and geomagnetic conditions.",
  },
  {
    id: "daily-geomagnetic-indices",
    title: "Daily geomagnetic indices",
    body: "The daily geomagnetic indices are NOAA’s table of observed Kp and A indices for the last 30 days, per station: Fredericksburg middle-latitude, College high-latitude, and estimated planetary. Negative or –1 values mean no data for that interval.",
  },
  {
    id: "geophysical-alert",
    title: "Geophysical alert",
    body: "The geophysical alert – labelled “Geophysical Alert Message” in the interface, named geophysical-alert in code – is NOAA’s alert message covering solar X-ray, energetic-particle, and geomagnetic conditions, with observations and predictions. It is the freshest, most frequently updated product.",
  },
  {
    id: "day-summary",
    title: "Day summary",
    body: "The day summary is the 24-hour activity summary at the start of each forecast discussion section. It tells you what happened in the past day before the forecast that follows.",
  },
  {
    id: "rationale",
    title: "Rationale",
    body: "The rationale is the concluding prose of each 3-day forecast section, explaining the forecast in the forecaster’s words. It follows the probability table and is not a per-region breakdown.",
  },
];

/** The entry with this anchor id, or undefined when the id is unknown. */
export const getGlossaryEntry = (id: string): GlossaryEntry | undefined =>
  GLOSSARY_ENTRIES.find((entry) => entry.id === id);
