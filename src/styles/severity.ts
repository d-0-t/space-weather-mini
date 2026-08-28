/**
 * Severity ramp for chart lines: each metric maps its value range onto a
 * shared gray → green → yellow → orange → red → magenta scale (worst).
 * Lines switch color as values cross thresholds; callers pass a curried
 * severityColor(metric, value) as the chart's colorBy.
 */

export type SeverityColor =
  | "gray"
  | "green"
  | "yellow"
  | "orange"
  | "red"
  | "magenta";

export const SEVERITY_HEX: Record<SeverityColor, string> = {
  gray: "#9aa0a6",
  green: "#4ade80",
  yellow: "#facc15",
  orange: "#fb923c",
  red: "#f44336",
  magenta: "#ff00ea",
};

export type SeverityMetric =
  | "speed"
  | "density"
  | "bt"
  | "bz"
  | "hemi"
  | "dst"
  | "boulder";

interface SeverityBand {
  /** Values strictly below this threshold take `color` (ascending order). */
  upTo: number;
  color: SeverityColor;
}

export const SEVERITY_BANDS: Record<SeverityMetric, SeverityBand[]> = {
  speed: [
    { upTo: 200, color: "gray" },
    { upTo: 300, color: "green" },
    { upTo: 400, color: "yellow" },
    { upTo: 600, color: "red" },
    { upTo: Infinity, color: "magenta" },
  ],
  density: [
    { upTo: 1, color: "gray" },
    { upTo: 10, color: "green" },
    { upTo: 20, color: "yellow" },
    { upTo: 40, color: "orange" },
    { upTo: 60, color: "red" },
    { upTo: Infinity, color: "magenta" },
  ],
  bt: [
    { upTo: 5, color: "green" },
    { upTo: 15, color: "yellow" },
    { upTo: 30, color: "red" },
    { upTo: Infinity, color: "magenta" },
  ],
  // Southward (negative) is the disturbance direction: deeper = worse.
  bz: [
    { upTo: -10, color: "magenta" },
    { upTo: -5, color: "red" },
    { upTo: 0, color: "yellow" },
    { upTo: Infinity, color: "green" },
  ],
  hemi: [
    { upTo: 10, color: "green" },
    { upTo: 30, color: "yellow" },
    { upTo: 50, color: "red" },
    { upTo: Infinity, color: "magenta" },
  ],
  // Deeper negative = stronger storm.
  dst: [
    { upTo: -100, color: "magenta" },
    { upTo: -50, color: "red" },
    { upTo: -30, color: "yellow" },
    { upTo: Infinity, color: "green" },
  ],
  boulder: [
    { upTo: 3, color: "green" },
    { upTo: 4, color: "yellow" },
    { upTo: 5, color: "red" },
    { upTo: Infinity, color: "magenta" },
  ],
};

/** Hex color for a metric value under its severity bands. */
export function severityColor(metric: SeverityMetric, value: number): string {
  const bands = SEVERITY_BANDS[metric];
  for (const band of bands) {
    if (value < band.upTo) return SEVERITY_HEX[band.color];
  }
  return SEVERITY_HEX[bands[bands.length - 1].color];
}
