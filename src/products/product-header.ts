// Shared parsing helpers for NOAA text products: the header metadata (the
// issued line and the "Prepared by" author line) and the local-time display
// convention. Formats vary per product, so matching is lenient.

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function makeUtcDate(
  year: string,
  monthName: string,
  day: string,
  hour: string,
  minute: string
): Date {
  const month = MONTHS.indexOf(monthName);
  if (month === -1) {
    throw new Error(
      "parseIssuedDate: unknown month — the NOAA format may have changed"
    );
  }
  return new Date(
    Date.UTC(Number(year), month, Number(day), Number(hour), Number(minute))
  );
}

// The issued line is always UTC, in one of two shapes:
// "2026 Aug 23 1230 UTC" or "1830 UT 23 Aug 2026".
export function parseIssuedDate(issued: string): Date {
  const utcFirst = issued.match(/^(\d{4}) (\w{3}) (\d{1,2}) (\d{2})(\d{2}) UTC$/);
  if (utcFirst) {
    return makeUtcDate(utcFirst[1], utcFirst[2], utcFirst[3], utcFirst[4], utcFirst[5]);
  }
  const utcLast = issued.match(/^(\d{2})(\d{2}) UT (\d{1,2}) (\w{3}) (\d{4})$/);
  if (utcLast) {
    return makeUtcDate(utcLast[5], utcLast[4], utcLast[3], utcLast[1], utcLast[2]);
  }
  throw new Error(
    "parseIssuedDate: unexpected issued format — the NOAA format may have changed"
  );
}

// Formats a product's issued line as the visitor's local time, naming the
// timezone so the conversion is unambiguous.
export function formatIssuedLocal(issued: string): string {
  return parseIssuedDate(issued).toLocaleString(undefined, {
    timeZoneName: "long",
  });
}

// The author line, e.g. "# Prepared by the U.S. Dept. of Commerce, NOAA, ...".
// The whitespace after "#" varies between products ("# " vs "#  ").
export function matchPreparedBy(line: string): string | null {
  const match = line.match(/^#\s+(Prepared by .+)$/);
  return match ? match[1] : null;
}

// Scans a product's leading header lines (":Product:", ":Issued:", "# ...")
// for the issued timestamp and the author line. The scan ends at the first
// body line; body parsing is the caller's job.
export function scanHeader(text: string): { issued: string; author: string } {
  let issued = "";
  let author = "";
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const issuedMatch = line.match(/^:Issued: (.+)$/);
    if (issuedMatch) {
      issued = issuedMatch[1].trim();
      continue;
    }
    const authorMatch = matchPreparedBy(line);
    if (authorMatch !== null) {
      author = authorMatch;
      continue;
    }
    if (line.startsWith(":") || line.startsWith("#") || line === "") continue;
    break;
  }
  return { issued, author };
}