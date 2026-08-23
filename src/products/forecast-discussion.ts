import { scanHeader } from "./product-header";

export interface DiscussionSection {
  daySummary: string;
  forecast: string;
}

export interface ForecastDiscussion {
  issued: string;
  author: string;
  solarActivity: DiscussionSection;
  energeticParticle: DiscussionSection;
  solarWind: DiscussionSection;
  geospace: DiscussionSection;
}

export const FORECAST_DISCUSSION_URL =
  "https://services.swpc.noaa.gov/text/discussion.txt";

const SECTION_TITLES = [
  "Solar Activity",
  "Energetic Particle",
  "Solar Wind",
  "Geospace",
];
const SUMMARY_MARKER = ".24 hr Summary...";
const FORECAST_MARKER = ".Forecast...";

// A section's prose keeps NOAA's source line breaks (blank lines separate
// paragraphs) so the page can render it with pre-line.
function parseSection(title: string, lines: string[]): DiscussionSection {
  const summaryStart = lines.indexOf(SUMMARY_MARKER);
  const forecastStart = lines.indexOf(FORECAST_MARKER);
  if (summaryStart === -1 || forecastStart === -1) {
    throw new Error(
      `parseForecastDiscussion: ${title} has no ${summaryStart === -1 ? SUMMARY_MARKER : FORECAST_MARKER} marker — the NOAA format may have changed`
    );
  }
  const daySummary = lines.slice(summaryStart + 1, forecastStart).join("\n").trim();
  const forecast = lines.slice(forecastStart + 1).join("\n").trim();
  if (daySummary === "" || forecast === "") {
    throw new Error(
      `parseForecastDiscussion: ${title} has empty prose — the NOAA format may have changed`
    );
  }
  return { daySummary, forecast };
}

export function parseForecastDiscussion(text: string): ForecastDiscussion {
  const { issued, author } = scanHeader(text);
  if (issued === "") {
    throw new Error(
      "parseForecastDiscussion: no :Issued: line found — the NOAA format may have changed"
    );
  }
  if (author === "") {
    throw new Error(
      "parseForecastDiscussion: no Prepared by line found — the NOAA format may have changed"
    );
  }

  const sections: Record<string, string[]> = {};
  let currentTitle: string | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (line.startsWith(":") || line.startsWith("#")) continue;
    if (SECTION_TITLES.includes(line.trim())) {
      const title = line.trim();
      if (sections[title]) {
        throw new Error(
          `parseForecastDiscussion: duplicate section ${title} — the NOAA format may have changed`
        );
      }
      currentTitle = title;
      sections[title] = [];
      continue;
    }
    if (currentTitle !== null) sections[currentTitle].push(line);
  }

  const missing = SECTION_TITLES.filter((title) => !sections[title]);
  if (missing.length > 0) {
    throw new Error(
      `parseForecastDiscussion: missing section(s) ${missing.join(", ")} — the NOAA format may have changed`
    );
  }

  return {
    issued,
    author,
    solarActivity: parseSection("Solar Activity", sections["Solar Activity"]),
    energeticParticle: parseSection(
      "Energetic Particle",
      sections["Energetic Particle"]
    ),
    solarWind: parseSection("Solar Wind", sections["Solar Wind"]),
    geospace: parseSection("Geospace", sections["Geospace"]),
  };
}