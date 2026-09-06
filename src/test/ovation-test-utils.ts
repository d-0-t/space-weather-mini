/**
 * Shared OVATION fetch double: builds a synthetic Oval grid shaped like the
 * live `ovation_aurora_latest.json` payload. Used by the Home, dashboard and
 * AuroraNow suites so the mock payload never drifts between them.
 */

/** Builds the OVATION JSON body for a small synthetic `[lon, lat, aurora]` grid. */
export const ovationJson = (
  cells: Array<[number, number, number]>,
): string =>
  JSON.stringify({
    "Observation Time": "2026-09-04T13:20:00Z",
    "Forecast Time": "2026-09-04T14:33:00Z",
    "Data Format": "[Longitude, Latitude, Aurora]",
    coordinates: cells,
  });
