export interface DayOutlookRow {
  date: string;
  radioFlux: number;
  aIndex: number;
  kpIndex: number;
}

export interface TwentySevenDayOutlook {
  issued: string;
  rows: DayOutlookRow[];
}

export const TWENTY_SEVEN_DAY_OUTLOOK_URL =
  "https://services.swpc.noaa.gov/text/27-day-outlook.txt";

// Matches a data row: "2026 Aug 17     130          15          4"
const ROW_PATTERN = /^(\d{4} \w{3} \d{2})\s+(\d+)\s+(\d+)\s+(\d+)$/;

export function parse27DayOutlook(text: string): TwentySevenDayOutlook {
  let issued = "";
  const rows: DayOutlookRow[] = [];

  for (const line of text.split(/\r?\n/)) {
    const issuedMatch = line.match(/^:Issued: (.+)$/);
    if (issuedMatch) {
      issued = issuedMatch[1].trim();
      continue;
    }
    if (line.startsWith(":") || line.startsWith("#") || line.trim() === "") {
      continue;
    }
    const rowMatch = line.match(ROW_PATTERN);
    if (rowMatch) {
      rows.push({
        date: rowMatch[1],
        radioFlux: Number(rowMatch[2]),
        aIndex: Number(rowMatch[3]),
        kpIndex: Number(rowMatch[4]),
      });
    }
  }

  if (rows.length === 0) {
    throw new Error("parse27DayOutlook: no data rows found — the NOAA format may have changed");
  }
  if (issued === "") {
    throw new Error("parse27DayOutlook: no :Issued: line found — the NOAA format may have changed");
  }

  return { issued, rows };
}