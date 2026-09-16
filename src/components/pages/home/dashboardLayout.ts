import { useEffect, useState } from "react";

/**
 * Dashboard arrangeable layout (ticket 04): per-Layout bucket column
 * membership with the agreed defaults. One versioned object holds the
 * 1-column list, the 2-column A/B pair and the 3-column A/B/C triple;
 * corrupt shapes fall back to defaults, missing known panels append to the
 * sensible last column, and unknown future ids are preserved in place.
 */

/** One top-level collapsible unit on the Dashboard. */
export type DashboardPanelId =
  | "aurora-now"
  | "pinned-webcams"
  | "summary"
  | "oval-glow"
  | "possible-locations"
  | "solar-wind"
  | "magnetosphere"
  | "forecast";

/** One Dashboard column shape: 1-column, 2-column or 3-column. */
export type LayoutBucket = "1-column" | "2-column" | "3-column";

/** Per-bucket column membership, versioned for localStorage. */
export interface DashboardLayout {
  v: 1;
  /** 1-column bucket: top-to-bottom order below md. */
  single: DashboardPanelId[];
  /** 2-column bucket: [A, B] from md to below xl. */
  double: [DashboardPanelId[], DashboardPanelId[]];
  /** 3-column bucket: [A, B, C] at xl and above. */
  triple: [DashboardPanelId[], DashboardPanelId[], DashboardPanelId[]];
}

export const DASHBOARD_LAYOUT_STORAGE_KEY = "sw:dashboard:layout:v1";

/** All eight Dashboard panels in vocabulary order. */
const KNOWN_PANEL_IDS: readonly DashboardPanelId[] = [
  "aurora-now",
  "pinned-webcams",
  "summary",
  "oval-glow",
  "possible-locations",
  "solar-wind",
  "magnetosphere",
  "forecast",
];

/** The agreed per-bucket defaults (spec Implementation Decisions). */
export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  v: 1,
  single: [
    "aurora-now",
    "pinned-webcams",
    "summary",
    "oval-glow",
    "possible-locations",
    "solar-wind",
    "magnetosphere",
    "forecast",
  ],
  double: [
    ["aurora-now", "summary", "oval-glow", "forecast"],
    ["pinned-webcams", "possible-locations", "solar-wind", "magnetosphere"],
  ],
  triple: [
    ["aurora-now", "summary", "oval-glow"],
    ["solar-wind", "magnetosphere"],
    ["pinned-webcams", "possible-locations", "forecast"],
  ],
};

/** The md Breakpoint query: 2-column from md (canonical 810px, ADR-0009). */
export const MD_QUERY = "(min-width: 810px)";
/** The xl Breakpoint query: 3-column at xl (canonical 1600px, ADR-0011). */
export const XL_QUERY = "(min-width: 1600px)";
/**
 * Landscape-phone exception (raw query, ADR-0011): rotated phones render the
 * normal 2-column reflow even below md.
 */
export const LANDSCAPE_QUERY =
  "(orientation: landscape) and (min-width: 670px) and (max-height: 500px)";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

/** Dedupe keeping the first occurrence, preserving unknown ids in place. */
const dedupe = (ids: string[]): string[] => [...new Set(ids)];

/**
 * Normalize one bucket's columns: drop non-strings, dedupe within the
 * bucket keeping the first occurrence, then append any known panel missing
 * from the whole bucket to the last column so nothing vanishes. A column
 * the visitor emptied on purpose (every known panel lives in a sibling
 * column) stays empty and collapses at render; only a corrupt partial
 * bucket is refilled. Unknown future ids are preserved in place.
 */
const normalizeBucket = (columns: string[][]): string[][] => {
  const cleaned = columns.map((col) => dedupe(col.filter((id) => typeof id === "string")));
  const seen = new Set(cleaned.flat());
  const missing = KNOWN_PANEL_IDS.filter((id) => !seen.has(id));
  if (missing.length > 0) {
    cleaned[cleaned.length - 1] = [...cleaned[cleaned.length - 1], ...missing];
  }
  // Drop duplicate ids across columns, keeping the first occurrence.
  const claimed = new Set<string>();
  return cleaned.map((col) =>
    col.filter((id) => {
      if (claimed.has(id)) return false;
      claimed.add(id);
      return true;
    }),
  );
};

/** Load the per-bucket membership, falling back to defaults on corrupt shapes. */
export function loadDashboardLayout(
  storage: Pick<Storage, "getItem">,
): DashboardLayout {
  try {
    const raw = storage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY);
    if (!raw) return DEFAULT_DASHBOARD_LAYOUT;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null || parsed.v !== 1) {
      return DEFAULT_DASHBOARD_LAYOUT;
    }
    const { single, double, triple } = parsed as {
      single?: unknown;
      double?: unknown;
      triple?: unknown;
    };
    if (
      !isStringArray(single) ||
      !Array.isArray(double) ||
      double.length !== 2 ||
      !double.every(isStringArray) ||
      !Array.isArray(triple) ||
      triple.length !== 3 ||
      !triple.every(isStringArray)
    ) {
      return DEFAULT_DASHBOARD_LAYOUT;
    }
    const [singleNorm] = normalizeBucket([single]);
    const doubleNorm = normalizeBucket(double as string[][]);
    const tripleNorm = normalizeBucket(triple as string[][]);
    return {
      v: 1,
      single: singleNorm as DashboardPanelId[],
      double: doubleNorm as [DashboardPanelId[], DashboardPanelId[]],
      triple: tripleNorm as [DashboardPanelId[], DashboardPanelId[], DashboardPanelId[]],
    };
  } catch {
    return DEFAULT_DASHBOARD_LAYOUT;
  }
}

/** Persist every bucket's column membership. */
export function saveDashboardLayout(
  storage: Pick<Storage, "setItem">,
  layout: DashboardLayout,
): void {
  storage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
}

/** Pure bucket resolution for tests and the hook below. */
export function getLayoutBucket(flags: {
  md: boolean;
  xl: boolean;
  landscape: boolean;
}): LayoutBucket {
  if (flags.xl) return "3-column";
  if (flags.md || flags.landscape) return "2-column";
  return "1-column";
}

/** Columns for the active bucket, verbatim (empty columns collapse at render). */
export function getBucketColumns(
  layout: DashboardLayout,
  bucket: LayoutBucket,
): DashboardPanelId[][] {
  if (bucket === "1-column") return [layout.single];
  if (bucket === "2-column") return layout.double;
  return layout.triple;
}

/**
 * Track the active Layout bucket: 1-column below md, 2-column from md to
 * below xl, 3-column at xl, plus the landscape-phone exception. Switching
 * buckets re-renders immediately via matchMedia change events.
 */
export function useLayoutBucket(): LayoutBucket {
  const read = (): LayoutBucket => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return "1-column";
    }
    const md = window.matchMedia(MD_QUERY).matches;
    const xl = window.matchMedia(XL_QUERY).matches;
    const landscape = window.matchMedia(LANDSCAPE_QUERY).matches;
    return getLayoutBucket({ md, xl, landscape });
  };
  const [bucket, setBucket] = useState<LayoutBucket>(read);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const queries = [MD_QUERY, XL_QUERY, LANDSCAPE_QUERY].map((query) =>
      window.matchMedia(query),
    );
    const onChange = () => setBucket(read());
    for (const query of queries) {
      if (typeof query.addEventListener === "function") {
        query.addEventListener("change", onChange);
      }
    }
    onChange();
    return () => {
      for (const query of queries) {
        if (typeof query.removeEventListener === "function") {
          query.removeEventListener("change", onChange);
        }
      }
    };
    // read is stable (module queries only).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return bucket;
}
