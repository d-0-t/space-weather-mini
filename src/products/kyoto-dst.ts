/** Kyoto Dst index product. */

export interface DstPoint {
  time_tag: string;
  dst: number;
}

export interface KyotoDst {
  points: DstPoint[];
}

export const KYOTO_DST_URL = "https://services.swpc.noaa.gov/products/kyoto-dst.json";

/**
 * Parses Kyoto Dst JSON string (array of {time_tag, dst}).
 * Throws if format changes.
 */
export function parseKyotoDst(text: string): KyotoDst {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("parseKyotoDst: invalid JSON — the NOAA format may have changed");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("parseKyotoDst: root is not an array — the NOAA format may have changed");
  }
  if (parsed.length === 0) {
    throw new Error("parseKyotoDst: empty array — the NOAA format may have changed");
  }
  const points: DstPoint[] = parsed.map((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error(
        `parseKyotoDst: item ${index} is not an object — the NOAA format may have changed`,
      );
    }
    const { time_tag, dst } = item as Record<string, unknown>;
    if (typeof time_tag !== "string" || typeof dst !== "number") {
      throw new Error(
        `parseKyotoDst: item ${index} missing time_tag/dst — the NOAA format may have changed`,
      );
    }
    return { time_tag, dst };
  });
  return { points };
}
