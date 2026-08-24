import { scanHeader } from "./product-header";

/**
 * The geophysical alert product as a typed model. The light model preserves
 * NOAA's prose as text with source line breaks so the page can render it
 * with pre-line. The three body paragraphs are the solar indices message,
 * the observed storm paragraph, and the predicted storm paragraph.
 */
export interface GeophysicalAlert {
  issued: string;
  author: string;
  /** Solar-terrestrial indices paragraph — the "Geophysical Alert Message" body. */
  message: string;
  /** Observed paragraph (e.g. "No space weather storms were observed..."). */
  observed: string;
  /** Predicted paragraph (e.g. "No space weather storms are predicted..."). */
  predicted: string;
}

// NOAA SWPC text product URL for the geophysical alert.
export const GEOPHYSICAL_ALERT_URL =
  "https://services.swpc.noaa.gov/text/wwv.txt";

export function parseGeophysicalAlert(text: string): GeophysicalAlert {
  const { issued, author } = scanHeader(text);
  if (issued === "") {
    throw new Error(
      "parseGeophysicalAlert: no :Issued: line found — the NOAA format may have changed"
    );
  }
  if (author === "") {
    throw new Error(
      "parseGeophysicalAlert: no Prepared by line found — the NOAA format may have changed"
    );
  }

  // The body starts at the first line that is neither a header comment
  // (":" or "#") nor a blank line. This mirrors scanHeader's break.
  const lines = text.split(/\r?\n/);
  let bodyStart = -1;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trimEnd();
    if (line.startsWith(":") || line.startsWith("#") || line === "") continue;
    bodyStart = index;
    break;
  }
  if (bodyStart === -1) {
    throw new Error(
      "parseGeophysicalAlert: no body found — the NOAA format may have changed"
    );
  }

  // Strip stray HTML tags that NOAA has emitted since Aug 2026 (e.g. <o:p></o:p></span>)
  // before paragraph splitting, but preserve line breaks.
  const stripHtmlTags = (input: string): string =>
    input.replace(/<[^>]*>/g, "");

  // Preserve source line breaks within paragraphs but split on blank lines.
  const bodyText = stripHtmlTags(
    lines.slice(bodyStart).join("\n").trim(),
  );

  const paragraphs = bodyText
    .split(/\n\s*\n/)
    .map((paragraph) => stripHtmlTags(paragraph).trim())
    .filter((paragraph) => paragraph !== "");

  if (paragraphs.length < 2) {
    throw new Error(
      "parseGeophysicalAlert: observed and predicted paragraphs not found — the NOAA format may have changed"
    );
  }

  const predicted = paragraphs[paragraphs.length - 1];
  const observed = paragraphs[paragraphs.length - 2];
  const message = paragraphs.slice(0, -2).join("\n\n").trim();

  if (!/predicted|next 24 hours/i.test(predicted)) {
    throw new Error(
      "parseGeophysicalAlert: predicted paragraph not found — the NOAA format may have changed"
    );
  }
  if (!/observed|past 24 hours/i.test(observed)) {
    throw new Error(
      "parseGeophysicalAlert: observed paragraph not found — the NOAA format may have changed"
    );
  }
  if (observed === "" || predicted === "") {
    throw new Error(
      "parseGeophysicalAlert: observed or predicted paragraph is empty — the NOAA format may have changed"
    );
  }
  if (message === "") {
    throw new Error(
      "parseGeophysicalAlert: Geophysical Alert Message paragraph not found — the NOAA format may have changed"
    );
  }

  return { issued, author, message, observed, predicted };
}
