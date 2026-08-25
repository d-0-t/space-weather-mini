import type { KpBreakdownRow } from "./3-day-forecast";

export interface MinMaxKpDay {
  day: string;
  min: number;
  max: number;
  gLabel: string | null;
}

/**
 * Derives per-day min/max Kp from the 8-row breakdown.
 * Adds G bonus label when max >=5 per geomagnetic storm scale (G1 at 5, G5 at 9).
 */
export function deriveMinMaxKp(
  days: string[],
  kpBreakdown: KpBreakdownRow[],
): MinMaxKpDay[] {
  return days.map((day, i) => {
    const values = kpBreakdown.map((row) => row.days[i]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const gLabel = max >= 5 ? `G${Math.min(5, Math.floor(max) - 4)}` : null;
    return { day, min, max, gLabel };
  });
}
