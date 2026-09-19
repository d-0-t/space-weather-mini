/**
 * The L1 (solar wind) reading helpers the Summary's claims run on (the
 * time-ahead selector's "Now" rule): the L1→Earth transit for a measured
 * speed, and the 5-minute-average lookup that turns the bursting 1-minute
 * feeds into the displayed readings. Pure over time tags and rows, so the
 * push sender (ticket 05) grades the Live alert's verdict word through the
 * same functions the app displays with – the averaging discipline is shared,
 * never forked.
 */

import { parseTimeTag } from "./display-time";

// DSCOVR sits at L1, ~1.5 million km upstream of Earth. The measured solar
// wind reaches Earth `1.5e6 / speed` minutes later – the "Now" line is drawn
// that far past the latest reading on the solar-wind charts.
const L1_DISTANCE_KM = 1_500_000;

/** L1 → Earth transit in minutes from the measured solar wind speed (km/s). */
export function transitMinutes(speedKmS: number | null): number {
  if (speedKmS === null || speedKmS <= 0) return 0;
  return Math.round(L1_DISTANCE_KM / speedKmS / 60);
}

/** Adds minutes to an ISO-ish time_tag; returns "YYYY-MM-DDTHH:MM". */
export function addMinutes(timeTag: string, minutes: number): string {
  const normalized = timeTag.replace("_", "T");
  const iso =
    normalized.endsWith("Z") || normalized.includes("+")
      ? normalized
      : `${normalized}Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return timeTag;
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d.toISOString().slice(0, 16);
}

export function latestValue(rows: { time_tag: string; value: number | null }[]): {
  value: number | null;
  timeTag: string | null;
} {
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].value !== null) {
      return { value: rows[i].value as number, timeTag: rows[i].time_tag };
    }
  }
  return { value: null, timeTag: null };
}

/**
 * Value of the reading closest to (at or just before) the given time tag.
 * Rows are sorted ascending; compares minute-granular tags.
 */
export function valueAt(
  rows: { time_tag: string; value: number | null }[],
  timeTag: string,
): { value: number | null; timeTag: string | null } {
  const key = timeTag.slice(0, 16);
  let hit: { time_tag: string; value: number | null } | null = null;
  for (const row of rows) {
    if (row.time_tag.slice(0, 16) <= key) hit = row;
    else break;
  }
  return hit && hit.value !== null
    ? { value: hit.value, timeTag: hit.time_tag }
    : { value: null, timeTag: null };
}

/**
 * Mean of the non-null readings within a symmetric 5-minute window
 * (±2.5 min) around the given instant. The 1-min RTSW bursts 2–4 rows per
 * minute, so single readings flicker; the displayed current values are
 * the average instead. An anchor minute without its own reading still
 * yields the mean of its window neighbours. Returns the mean with the
 * anchor instant as its time tag, or null when no reading falls inside
 * the window (no data, never zero).
 */
export function averagedValueAt(
  rows: { time_tag: string; value: number | null }[],
  timeTag: string,
): { value: number | null; timeTag: string | null } {
  const anchor = parseTimeTag(timeTag);
  if (Number.isNaN(anchor)) return { value: null, timeTag: null };
  const halfWindowMs = 2.5 * 60_000;
  let sum = 0;
  let count = 0;
  for (const row of rows) {
    if (row.value === null) continue;
    const ms = parseTimeTag(row.time_tag);
    if (Number.isNaN(ms)) continue;
    if (Math.abs(ms - anchor) <= halfWindowMs) {
      sum += row.value;
      count += 1;
    }
  }
  return count > 0
    ? { value: sum / count, timeTag }
    : { value: null, timeTag: null };
}
