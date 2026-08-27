import { scanHeader } from "./product-header";

/**
 * One of the two narrative sections of the weekly report. The body
 * preserves NOAA's source line breaks (blank lines separate paragraphs)
 * so the page can render it with pre-line.
 */
export interface WeeklySection {
  title: string;
  dateRange: string;
  body: string;
}

export interface WeeklyReport {
  issued: string;
  author: string;
  highlights: WeeklySection;
  forecast: WeeklySection;
}

// NOAA SWPC text product URL for the weekly report.
export const WEEKLY_REPORT_URL =
  "https://services.swpc.noaa.gov/text/weekly.txt";

// NOAA section headings – must match the fixture verbatim; format drift throws.
const HIGHLIGHTS_TITLE = "Highlights of Solar and Geomagnetic Activity";
const FORECAST_TITLE = "Forecast of Solar and Geomagnetic Activity";

function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

function extractSection(
  lines: string[],
  title: string,
  titleIndex: number,
  nextTitleIndex: number | null
): WeeklySection {
  // The date range is the first non-empty line after the title.
  let dateRangeIndex = titleIndex + 1;
  while (
    dateRangeIndex < lines.length &&
    lines[dateRangeIndex].trim() === ""
  ) {
    dateRangeIndex++;
  }
  if (dateRangeIndex >= lines.length || lines[dateRangeIndex].trim() === "") {
    throw new Error(
      `parseWeeklyReport: ${title} has no date range – the NOAA format may have changed`
    );
  }
  const dateRange = stripHtmlTags(lines[dateRangeIndex].trim()).trim();

  const end = nextTitleIndex ?? lines.length;
  const bodyLines = lines.slice(dateRangeIndex + 1, end);
  const body = stripHtmlTags(bodyLines.join("\n")).trim();
  if (body === "") {
    throw new Error(
      `parseWeeklyReport: ${title} has empty prose – the NOAA format may have changed`
    );
  }
  return { title, dateRange, body };
}

export function parseWeeklyReport(text: string): WeeklyReport {
  const { issued, author } = scanHeader(text);
  if (issued === "") {
    throw new Error(
      "parseWeeklyReport: no :Issued: line found – the NOAA format may have changed"
    );
  }
  if (author === "") {
    throw new Error(
      "parseWeeklyReport: no Prepared by line found – the NOAA format may have changed"
    );
  }

  // Keep trailing spaces stripped but preserve empty lines for paragraph breaks.
  const lines = text.split(/\r?\n/).map((line) => line.trimEnd());

  const highlightsIndex = lines.findIndex(
    (line) => line.trim() === HIGHLIGHTS_TITLE
  );
  const forecastIndex = lines.findIndex(
    (line) => line.trim() === FORECAST_TITLE
  );

  if (highlightsIndex === -1) {
    throw new Error(
      "parseWeeklyReport: Highlights section not found – the NOAA format may have changed"
    );
  }
  if (forecastIndex === -1) {
    throw new Error(
      "parseWeeklyReport: Forecast section not found – the NOAA format may have changed"
    );
  }
  if (forecastIndex <= highlightsIndex) {
    throw new Error(
      "parseWeeklyReport: Forecast section must follow Highlights – the NOAA format may have changed"
    );
  }

  const highlights = extractSection(
    lines,
    HIGHLIGHTS_TITLE,
    highlightsIndex,
    forecastIndex
  );
  const forecast = extractSection(
    lines,
    FORECAST_TITLE,
    forecastIndex,
    null
  );

  return { issued, author, highlights, forecast };
}
