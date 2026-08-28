/**
 * Parses a SWPC time string (ISO with or without trailing Z, or
 * "YYYY-MM-DD HH:MM" style, always UTC) to epoch milliseconds.
 * Returns NaN when the time cannot be parsed.
 */
export function toEpoch(timeTag: string): number {
  const iso = timeTag.endsWith("Z") || timeTag.includes("+") ? timeTag : `${timeTag}Z`;
  return new Date(iso).getTime();
}

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Formats a SWPC UTC time string as "Aug 26 16:36 UTC"; returns the raw
 * string when the time cannot be parsed.
 */
export function formatUtcShort(timeTag: string): string {
  const epoch = toEpoch(timeTag);
  if (Number.isNaN(epoch)) return timeTag;
  const d = new Date(epoch);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()} ${hh}:${mm} UTC`;
}

/**
 * Formats the age of a live data timestamp relative to now.
 * Returns "just now", "Xm ago", or "Xh Ym ago".
 * Accepts ISO strings with or without trailing Z (assumes UTC if missing).
 */
export function formatAge(timeTag: string): string {
  const then = toEpoch(timeTag);
  const now = Date.now();
  const diffMs = now - then;
  if (Number.isNaN(then) || diffMs < 0) return "just now";
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const hours = Math.floor(diffMin / 60);
  const minutes = diffMin % 60;
  return `${hours}h ${minutes}m ago`;
}
