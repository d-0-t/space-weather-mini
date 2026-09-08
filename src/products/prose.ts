// Shared prose normalisation for NOAA text products.
//
// NOAA hard-wraps narrative prose at ~72 columns, so the source line breaks
// land mid-sentence. Pages render prose with `white-space: pre-line`, which
// honours every newline literally and produces ragged text like
// "5 (NOAA Scale\nG1).". `normalizeProse` reflows each paragraph so a
// newline only survives where it follows the end of a sentence (".", "!"
// or "?", optionally closed by quotes, brackets or parens); mid-sentence
// breaks become spaces, and blank lines keep separating paragraphs.

// A sentence end: terminal punctuation, optionally followed by closing
// quotes/brackets, at the end of a source line, e.g. "...imagery." or
// "...(below NOAA Scale levels)."
const SENTENCE_END_PATTERN = /[.!?]["'”’)\]]*$/;

// Reflows one paragraph: NOAA's column wraps become spaces unless the
// previous line ended a sentence, runs of spaces collapse to one.
function normalizeParagraph(paragraph: string): string {
  let result = "";
  for (const rawLine of paragraph.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/[ \t]+/g, " ");
    if (line === "") continue;
    if (result === "") {
      result = line;
    } else if (SENTENCE_END_PATTERN.test(result)) {
      result += `\n${line}`;
    } else {
      result += ` ${line}`;
    }
  }
  return result;
}

/**
 * Reflows NOAA's hard-wrapped prose for `white-space: pre-line` rendering:
 * mid-sentence line breaks are joined into spaces, breaks after sentence
 * ends are kept, and blank-line paragraph gaps become "\n\n".
 */
export function normalizeProse(text: string): string {
  return text
    .split(/\r?\n[ \t]*\r?\n/)
    .map(normalizeParagraph)
    .filter((paragraph) => paragraph !== "")
    .join("\n\n");
}
