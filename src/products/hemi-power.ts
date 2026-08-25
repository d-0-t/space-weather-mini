/** Hemispheric power product — OVATION nowcast. */

export interface HemiPowerPoint {
  observationTime: string;
  forecastTime: string;
  northPowerGW: number;
  southPowerGW: number;
}

export interface HemiPower {
  points: HemiPowerPoint[];
}

export const HEMI_POWER_URL =
  "https://services.swpc.noaa.gov/text/aurora-nowcast-hemi-power.txt";

/**
 * Parses the hemi-power TXT string into typed points.
 * Ignores comment (#) and blank lines; each data line has observation, forecast, north GW, south GW.
 * Throws if no data rows found or format changes.
 */
export function parseHemiPower(text: string): HemiPower {
  const points: HemiPowerPoint[] = [];
  const ROW_PATTERN = /^(\d{4}-\d{2}-\d{2}_\d{2}:\d{2})\s+(\d{4}-\d{2}-\d{2}_\d{2}:\d{2})\s+(\S+)\s+(\S+)$/;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#") || line.startsWith("-")) continue;
    // Header line with dashes or column titles
    if (line.includes("YYYY") || line.includes("Observation") || line.includes("GigaWatts")) continue;
    const match = line.match(ROW_PATTERN);
    if (!match) {
      // If line looks like data but doesn't match, it's a format change
      if (/^\d{4}-\d{2}-\d{2}_\d{2}:\d{2}/.test(line)) {
        throw new Error(
          `parseHemiPower: unexpected row shape "${line}" — the NOAA format may have changed`,
        );
      }
      continue;
    }
    const [, observationTime, forecastTime, northStr, southStr] = match;
    const northPowerGW = Number(northStr);
    const southPowerGW = Number(southStr);
    if (Number.isNaN(northPowerGW) || Number.isNaN(southPowerGW)) {
      // n/a or missing data — skip? But spec says throw on format change if not numeric?
      // Treat n/a as format change for now? Actually spec says ignore blank but n/a is missing data.
      // For Horizon 1, we expect numeric GW; if n/a, throw to surface format change, unless we want to skip.
      // We'll skip n/a lines to be resilient, but if both are n/a, skip.
      if (northStr === "n/a" || southStr === "n/a") continue;
      throw new Error(
        `parseHemiPower: non-numeric power value — the NOAA format may have changed`,
      );
    }
    points.push({ observationTime, forecastTime, northPowerGW, southPowerGW });
  }

  if (points.length === 0) {
    throw new Error(
      "parseHemiPower: no data rows found — the NOAA format may have changed",
    );
  }

  return { points };
}
