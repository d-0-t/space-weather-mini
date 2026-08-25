/** NOAA Scales product — current and 3-day G/R/S probabilities. */

export interface NoaaScaleEntry {
  Scale: string | null;
  Text: string | null;
  MinorProb?: string | null;
  MajorProb?: string | null;
  Prob?: string | null;
}

export interface NoaaScalesDay {
  DateStamp: string;
  TimeStamp: string;
  R: NoaaScaleEntry;
  S: NoaaScaleEntry;
  G: NoaaScaleEntry;
}

export interface NoaaScales {
  /** Combined DateStamp + TimeStamp of the current (key "0") entry for freshness display. */
  issued: string;
  current: NoaaScalesDay;
  day1: NoaaScalesDay;
  day2: NoaaScalesDay;
  day3: NoaaScalesDay;
  yesterday: NoaaScalesDay;
}

export const NOAA_SCALES_URL = "https://services.swpc.noaa.gov/products/noaa-scales.json";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDay(value: unknown, key: string): NoaaScalesDay {
  if (!isRecord(value)) {
    throw new Error(
      `parseNoaaScales: day "${key}" is not an object — the NOAA format may have changed`,
    );
  }
  const { DateStamp, TimeStamp, R, S, G } = value as Record<string, unknown>;
  if (typeof DateStamp !== "string" || typeof TimeStamp !== "string") {
    throw new Error(
      `parseNoaaScales: day "${key}" missing DateStamp/TimeStamp — the NOAA format may have changed`,
    );
  }
  if (!isRecord(R) || !isRecord(S) || !isRecord(G)) {
    throw new Error(
      `parseNoaaScales: day "${key}" missing R/S/G — the NOAA format may have changed`,
    );
  }
  return {
    DateStamp,
    TimeStamp,
    R: R as unknown as NoaaScaleEntry,
    S: S as unknown as NoaaScaleEntry,
    G: G as unknown as NoaaScaleEntry,
  };
}

/**
 * Parses the NOAA Scales JSON string into a typed product.
 * Throws a format-changed error if the JSON shape is unexpected.
 */
export function parseNoaaScales(text: string): NoaaScales {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      "parseNoaaScales: invalid JSON — the NOAA format may have changed",
    );
  }
  if (!isRecord(parsed)) {
    throw new Error(
      "parseNoaaScales: root is not an object — the NOAA format may have changed",
    );
  }
  const keys = ["0", "1", "2", "3", "-1"];
  for (const k of keys) {
    if (!(k in parsed)) {
      throw new Error(
        `parseNoaaScales: missing key "${k}" — the NOAA format may have changed`,
      );
    }
  }
  const current = parseDay(parsed["0"], "0");
  const day1 = parseDay(parsed["1"], "1");
  const day2 = parseDay(parsed["2"], "2");
  const day3 = parseDay(parsed["3"], "3");
  const yesterday = parseDay(parsed["-1"], "-1");

  const issued = `${current.DateStamp} ${current.TimeStamp}`;

  return { issued, current, day1, day2, day3, yesterday };
}
