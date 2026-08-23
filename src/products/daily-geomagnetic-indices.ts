export interface StationDay {
  aIndex: number;
  kIndices: number[];
}

export interface DailyIndicesRow {
  date: string;
  fredericksburg: StationDay;
  college: StationDay;
  planetary: StationDay;
}

export interface DailyGeomagneticIndices {
  issued: string;
  rows: DailyIndicesRow[];
}

export const DAILY_GEOMAGNETIC_INDICES_URL =
  "https://services.swpc.noaa.gov/text/daily-geomagnetic-indices.txt";

const DATE_PATTERN = /^\d{4} \d{2} \d{2}$/;
const VALUES_PER_ROW = 27; // 3 stations × (1 A index + 8 K indices)

// Splits a whitespace token that glues negative values together, e.g. "0-1-1"
// → ["0", "-1", "-1"]. NOAA emits glued negatives on partial (today) rows.
function expandToken(token: string): string[] {
  return token.split(/(?=-)/);
}

export function parseDailyGeomagneticIndices(text: string): DailyGeomagneticIndices {
  let issued = "";
  const rows: DailyIndicesRow[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "") continue;

    const issuedMatch = line.match(/^:Issued: (.+)$/);
    if (issuedMatch) {
      issued = issuedMatch[1].trim();
      continue;
    }
    if (line.startsWith(":") || line.startsWith("#")) continue;

    const tokens = line.split(/\s+/);
    const date = tokens.slice(0, 3).join(" ");
    if (!DATE_PATTERN.test(date)) continue;

    const values = tokens.slice(3).flatMap(expandToken).map(Number);
    if (values.length !== VALUES_PER_ROW) {
      throw new Error(
        "parseDailyGeomagneticIndices: unexpected row shape — the NOAA format may have changed"
      );
    }

    // Each station block is 9 values: 1 A index + 8 three-hourly Kp indices.
    const station = (offset: number): StationDay => ({
      aIndex: values[offset],
      kIndices: values.slice(offset + 1, offset + 9),
    });

    rows.push({
      date,
      fredericksburg: station(0),
      college: station(9),
      planetary: station(18),
    });
  }

  if (rows.length === 0) {
    throw new Error(
      "parseDailyGeomagneticIndices: no data rows found — the NOAA format may have changed"
    );
  }
  if (issued === "") {
    throw new Error(
      "parseDailyGeomagneticIndices: no :Issued: line found — the NOAA format may have changed"
    );
  }

  return { issued, rows };
}

// The day's largest Kp index for a station (ignores -1 "no data" placeholders).
export function largestK(station: StationDay): number {
  return Math.max(...station.kIndices);
}