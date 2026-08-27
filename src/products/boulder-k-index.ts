/** Boulder ground magnetometer – 1-minute local K index. */

export interface BoulderKPoint {
  time_tag: string;
  /** 1-min K index 0–9; null when flagged missing */
  k_index: number | null;
}

export const BOULDER_K_INDEX_URL =
  "https://services.swpc.noaa.gov/json/boulder_k_index_1m.json";

/**
 * Parses the Boulder K-index 1-minute JSON string.
 * The live feed is newest-first; returns points sorted oldest-first.
 * NOAA flags missing readings with -9999 – mapped to null.
 */
export function parseBoulderKIndex(text: string): BoulderKPoint[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      "parseBoulderKIndex: invalid JSON – the NOAA format may have changed",
    );
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(
      "parseBoulderKIndex: expected non-empty array – the NOAA format may have changed",
    );
  }
  const points = parsed.map((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error(
        `parseBoulderKIndex: item ${index} is not an object – the NOAA format may have changed`,
      );
    }
    const { time_tag, k_index } = item as Record<string, unknown>;
    if (typeof time_tag !== "string") {
      throw new Error(
        `parseBoulderKIndex: item ${index} missing time_tag – the NOAA format may have changed`,
      );
    }
    const value = typeof k_index === "number" ? k_index : null;
    return { time_tag, k_index: value === -9999 ? null : value };
  });
  return points.sort((a, b) => a.time_tag.localeCompare(b.time_tag));
}