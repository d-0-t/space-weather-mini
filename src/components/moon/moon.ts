/** Moon phase as an emoji + name pair. */
export interface MoonPhase {
  emoji: string;
  name: string;
}

const MOON_PHASES: MoonPhase[] = [
  { emoji: "🌑", name: "New moon" },
  { emoji: "🌒", name: "Waxing crescent" },
  { emoji: "🌓", name: "First quarter" },
  { emoji: "🌔", name: "Waxing gibbous" },
  { emoji: "🌕", name: "Full moon" },
  { emoji: "🌖", name: "Waning gibbous" },
  { emoji: "🌗", name: "Last quarter" },
  { emoji: "🌘", name: "Waning crescent" },
];

const SYNODIC_MONTH_DAYS = 29.530588853;
// Known new moon reference: 2000-01-06 18:14 UTC (Meeus)
const NEW_MOON_REF_UTC = Date.UTC(2000, 0, 6, 18, 14);

/** Cycle fraction 0..1 through the synodic month (0 = new moon). */
function cycleFraction(date: Date): number {
  const daysSince = (date.getTime() - NEW_MOON_REF_UTC) / 86_400_000;
  return (((daysSince / SYNODIC_MONTH_DAYS) % 1) + 1) % 1;
}

/**
 * Parses an ISO-ish UTC time tag (with or without a trailing Z, "T" or " "
 * separators). Charts pass both raw time_tags and toISOString() outputs, so
 * the Z is never appended twice.
 */
export function parseTimeTag(timeTag: string): Date {
  const iso =
    timeTag.endsWith("Z") || timeTag.includes("+") ? timeTag : `${timeTag}Z`;
  return new Date(iso);
}

/** Current moon phase from a date, as an emoji + name pair. */
export function getMoonPhase(date: Date = new Date()): MoonPhase {
  // An invalid date must never reach the bucket lookup (MOON_PHASES[NaN] is
  // undefined and would throw on .name access)
  if (Number.isNaN(date.getTime())) return MOON_PHASES[0];
  const index = Math.floor(cycleFraction(date) * 8) % 8;
  return MOON_PHASES[index] ?? MOON_PHASES[0];
}

/** Moon phase for a cycle fraction (0 = new moon, 0.5 = full moon). */
export function getMoonPhaseAtFraction(fraction: number): MoonPhase {
  if (Number.isNaN(fraction)) return MOON_PHASES[0];
  const index = Math.floor((((fraction % 1) + 1) % 1) * 8) % 8;
  return MOON_PHASES[index] ?? MOON_PHASES[0];
}

/**
 * Cycle fraction 0..1 of a date through the synodic month (0 = new moon).
 * NaN for invalid dates.
 */
export function moonCycleFraction(date: Date): number {
  if (Number.isNaN(date.getTime())) return NaN;
  return cycleFraction(date);
}

/** Fraction of the Moon's disk illuminated, 0 (new) to 1 (full). */
export function moonIllumination(date: Date = new Date()): number {
  const fraction = cycleFraction(date);
  return (1 - Math.cos(2 * Math.PI * fraction)) / 2;
}

/** Illumination as a rounded percent, 0-100. */
export function moonIlluminationPercent(date: Date = new Date()): number {
  return Math.round(moonIllumination(date) * 100);
}

/** Moon emoji for a midnight time tag, or null otherwise – the forecast chart's midnight markers. */
export function moonEmojiAtMidnight(timeTag: string): string | null {
  const d = parseTimeTag(timeTag);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0) return null;
  return getMoonPhase(d).emoji;
}