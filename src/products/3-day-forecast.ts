import { scanHeader } from "./product-header";

export interface KpBreakdownRow {
  timeSlot: string;
  days: number[];
}

export interface ProbabilityRow {
  label: string;
  days: number[];
}

export interface ThreeDayForecastSection {
  details: string;
  rationale: string;
}

export interface GeomagneticActivitySection extends ThreeDayForecastSection {
  kpBreakdown: KpBreakdownRow[];
}

export interface ProbabilitySection extends ThreeDayForecastSection {
  probabilities: ProbabilityRow[];
}

export interface ThreeDayForecast {
  issued: string;
  author: string;
  days: string[];
  geomagneticActivity: GeomagneticActivitySection;
  solarRadiationStorm: ProbabilitySection;
  radioBlackout: ProbabilitySection;
}

export const THREE_DAY_FORECAST_URL =
  "https://services.swpc.noaa.gov/text/3-day-forecast.txt";

// Section headers: "A. NOAA Geomagnetic Activity Observation and Forecast" etc.
const SECTION_HEADER_PATTERN = /^[ABC]\. NOAA /;
const KP_TABLE_TITLE_PATTERN = /^NOAA Kp index breakdown/;
const SOLAR_RADIATION_TABLE_TITLE_PATTERN = /^Solar Radiation Storm Forecast for/;
const RADIO_BLACKOUT_TABLE_TITLE_PATTERN = /^Radio Blackout Forecast for/;
const KP_ROW_PATTERN = /^\d{2}-\d{2}UT/;
// Any line carrying a percentage, e.g. "S1 or greater   25%     10%     10%".
const PROBABILITY_ROW_PATTERN = /%/;
// Day-name tokens in a table header, e.g. "Aug 23" in "Aug 23 Aug 24 Aug 25".
const DAY_TOKEN_PATTERN = /[A-Z][a-z]{2} \d{1,2}/g;

interface ParsedSection {
  details: string;
  rationale: string;
  dayHeader: string[];
  tableLines: string[];
}

// A section's prose keeps NOAA's source line breaks (blank lines separate
// paragraphs) so the page can render it with pre-line.
function parseSection(
  lines: string[],
  tableTitlePattern: RegExp,
  rowPattern: RegExp
): ParsedSection {
  const titleIndex = lines.findIndex((line) => tableTitlePattern.test(line));
  if (titleIndex === -1) {
    throw new Error(
      "parseThreeDayForecast: section table title not found — the NOAA format may have changed"
    );
  }
  const rationaleIndex = lines.findIndex((line) => line.startsWith("Rationale:"));
  if (rationaleIndex === -1) {
    throw new Error(
      "parseThreeDayForecast: section Rationale not found — the NOAA format may have changed"
    );
  }

  const details = lines.slice(0, titleIndex).join("\n").trim();

  const rationale = lines
    .slice(rationaleIndex)
    .join("\n")
    .replace(/^Rationale:\s*/, "")
    .trim();

  // Table rows live between the table title and the Rationale line, so a
  // stray percentage in the prose cannot be mistaken for a row.
  const firstRowIndex = lines.findIndex(
    (line, index) =>
      index > titleIndex && index < rationaleIndex && rowPattern.test(line)
  );
  if (firstRowIndex === -1) {
    throw new Error(
      "parseThreeDayForecast: no table rows found — the NOAA format may have changed"
    );
  }

  // The line above the first data row names the forecast days, e.g.
  // "             Aug 23       Aug 24       Aug 25".
  let dayHeaderIndex = firstRowIndex - 1;
  while (dayHeaderIndex > titleIndex && lines[dayHeaderIndex].trim() === "") {
    dayHeaderIndex--;
  }
  const dayHeader = lines[dayHeaderIndex].trim().match(DAY_TOKEN_PATTERN) ?? [];
  if (dayHeader.length !== 3) {
    throw new Error(
      "parseThreeDayForecast: expected 3 forecast days — the NOAA format may have changed"
    );
  }

  const tableLines = lines
    .slice(firstRowIndex, rationaleIndex)
    .map((line) => line.trim())
    .filter(Boolean);

  return { details, rationale, dayHeader, tableLines };
}

function parseKpRows(tableLines: string[]): KpBreakdownRow[] {
  return tableLines.map((line) => {
    const tokens = line.split(/\s+/);
    if (tokens.length !== 4) {
      throw new Error(
        "parseThreeDayForecast: unexpected Kp row shape — the NOAA format may have changed"
      );
    }
    return { timeSlot: tokens[0], days: tokens.slice(1).map(Number) };
  });
}

function parseProbabilityRows(tableLines: string[]): ProbabilityRow[] {
  return tableLines.map((line) => {
    const tokens = line.split(/\s+/);
    const firstPercent = tokens.findIndex((token) => token.endsWith("%"));
    if (firstPercent === -1) {
      throw new Error(
        "parseThreeDayForecast: probability row has no percentages — the NOAA format may have changed"
      );
    }
    const days = tokens.slice(firstPercent).map((token) => Number(token.slice(0, -1)));
    if (days.length !== 3) {
      throw new Error(
        "parseThreeDayForecast: unexpected probability row shape — the NOAA format may have changed"
      );
    }
    return { label: tokens.slice(0, firstPercent).join(" "), days };
  });
}

export function parseThreeDayForecast(text: string): ThreeDayForecast {
  const { issued, author } = scanHeader(text);
  if (issued === "") {
    throw new Error(
      "parseThreeDayForecast: no :Issued: line found — the NOAA format may have changed"
    );
  }
  if (author === "") {
    throw new Error(
      "parseThreeDayForecast: no Prepared by line found — the NOAA format may have changed"
    );
  }

  const sections: string[][] = [];
  let current: string[] | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (line.startsWith(":") || line.startsWith("#")) continue;
    if (SECTION_HEADER_PATTERN.test(line)) {
      if (current !== null) sections.push(current);
      current = [];
      continue;
    }
    if (current !== null) current.push(line);
  }
  if (current !== null) sections.push(current);

  if (issued === "") {
    throw new Error(
      "parseThreeDayForecast: no :Issued: line found — the NOAA format may have changed"
    );
  }
  if (author === "") {
    throw new Error(
      "parseThreeDayForecast: no Prepared by line found — the NOAA format may have changed"
    );
  }
  if (sections.length !== 3) {
    throw new Error(
      `parseThreeDayForecast: expected 3 sections, found ${sections.length} — the NOAA format may have changed`
    );
  }

  const geomagnetic = parseSection(
    sections[0],
    KP_TABLE_TITLE_PATTERN,
    KP_ROW_PATTERN
  );
  const solarRadiation = parseSection(
    sections[1],
    SOLAR_RADIATION_TABLE_TITLE_PATTERN,
    PROBABILITY_ROW_PATTERN
  );
  const radioBlackout = parseSection(
    sections[2],
    RADIO_BLACKOUT_TABLE_TITLE_PATTERN,
    PROBABILITY_ROW_PATTERN
  );

  return {
    issued,
    author,
    days: geomagnetic.dayHeader,
    geomagneticActivity: {
      details: geomagnetic.details,
      rationale: geomagnetic.rationale,
      kpBreakdown: parseKpRows(geomagnetic.tableLines),
    },
    solarRadiationStorm: {
      details: solarRadiation.details,
      rationale: solarRadiation.rationale,
      probabilities: parseProbabilityRows(solarRadiation.tableLines),
    },
    radioBlackout: {
      details: radioBlackout.details,
      rationale: radioBlackout.rationale,
      probabilities: parseProbabilityRows(radioBlackout.tableLines),
    },
  };
}