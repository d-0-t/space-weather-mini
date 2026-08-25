/**
 * Formats the age of a live data timestamp relative to now.
 * Returns "just now", "Xm ago", or "Xh Ym ago".
 * Accepts ISO strings with or without trailing Z (assumes UTC if missing).
 */
export function formatAge(timeTag: string): string {
  const iso = timeTag.endsWith("Z") || timeTag.includes("+") ? timeTag : `${timeTag}Z`;
  const then = new Date(iso).getTime();
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
