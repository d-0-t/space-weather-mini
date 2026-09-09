/**
 * The display-time module: the single owner of time rendering. Every
 * absolute timestamp the app shows is formatted here, in the chosen
 * Display timezone – short absolute strings, chart tick and tooltip
 * labels, 3-hour slot ranges, day labels and bucketing, plus the zone-free
 * relative ages. Only one zone is ever shown per fact: UTC mode keeps the
 * " UTC" suffix chasers expect, Local mode goes quiet about zones.
 */

import type { DisplayTimezone } from "./display-timezone";
import { parseIssuedDate } from "./product-header";

/**
 * Parses a SWPC UTC time tag to epoch milliseconds. The wire carries three
 * shapes – "2026-08-26T22:04:07" (with or without Z), "2026-08-26 22:04"
 * (space separator) and "2026-08-26_22:04" (hemi-power underscore) – all
 * read as UTC when no offset is present. Returns NaN when unparseable.
 */
export function parseTimeTag(timeTag: string): number {
  const normalized = timeTag.replace("_", "T");
  const iso =
    normalized.endsWith("Z") || normalized.includes("+")
      ? normalized
      : `${normalized}Z`;
  return new Date(iso).getTime();
}

/** The shared short-month table in NOAA order – the single source for
 * month-name rendering and month-name parsing (ticket 05 contract). */
export const MONTHS_SHORT = [
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
 * The zone-noise suffix: " UTC" in UTC mode, nothing in Local mode. Every
 * absolute string's zone suffix comes from here, so the rule lives in one
 * place – UTC mode keeps the suffix chasers expect, Local mode goes quiet.
 */
export function utcSuffix(displayTimezone: DisplayTimezone): string {
  return displayTimezone === "utc" ? " UTC" : "";
}

/** Memoizes an Intl formatter per time zone (undefined = the device zone). */
function cachedFormatter(
  formatters: Map<string, Intl.DateTimeFormat>,
  timeZone: string | undefined,
  make: () => Intl.DateTimeFormat,
): Intl.DateTimeFormat {
  const key = timeZone ?? "";
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = make();
    formatters.set(key, formatter);
  }
  return formatter;
}

/**
 * Short absolute string for a SWPC UTC time tag in the Display timezone:
 * UTC mode renders "Aug 26 16:36 UTC"; Local mode renders the device clock
 * bare ("16:33"), adding the short date when the zone crosses midnight
 * ("Sep 7 00:40"). Returns the raw string when the time cannot be parsed.
 */
export function formatShort(
  timeTag: string,
  displayTimezone: DisplayTimezone,
): string {
  const ms = parseTimeTag(timeTag);
  if (Number.isNaN(ms)) return timeTag;
  const d = new Date(ms);
  if (displayTimezone === "utc") {
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()} ${hh}:${mm}${utcSuffix(displayTimezone)}`;
  }
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const utcDay = `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
  const localDay = `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
  const time = `${hh}:${mm}`;
  return localDay === utcDay ? time : `${localDay} ${time}`;
}

const clockFormatters = new Map<string, Intl.DateTimeFormat>();

/**
 * The HH:MM clock label for an instant in the Display timezone – timeline
 * bands, webcam stamps. 2-digit, 24-hour, no suffix in either mode (Local
 * mode's clock is the visitor's own, UTC mode's is unambiguous without a
 * suffix next to other " UTC" stamps).
 */
export function formatClock(
  date: Date,
  displayTimezone: DisplayTimezone,
): string {
  return clockFormatter(
    displayTimezone === "utc" ? "UTC" : undefined,
  ).format(date);
}

const clockFormatter = (timeZone: string | undefined): Intl.DateTimeFormat =>
  cachedFormatter(clockFormatters, timeZone, () =>
    new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      ...(timeZone ? { timeZone } : {}),
    }),
  );

/**
 * The compact HH:MM chart-tick label for a SWPC time tag in the Display
 * timezone – the live-panel chart axes and inline freshness clocks. 2-digit,
 * 24-hour, no suffix in either mode (see formatClock). Renders an empty
 * label when the time cannot be parsed.
 */
export function formatClockTick(
  timeTag: string,
  displayTimezone: DisplayTimezone,
): string {
  const ms = parseTimeTag(timeTag);
  if (Number.isNaN(ms)) return "";
  return formatClock(new Date(ms), displayTimezone);
}

/**
 * The hover-tooltip timestamp for a SWPC time tag in the Display timezone,
 * keeping the compact "26 Aug 2026 22:04" shape the charts have always
 * shown; UTC mode appends " UTC", Local mode stays quiet about zones.
 * Returns the raw tag when the time cannot be parsed.
 */
export function formatTooltipTimestamp(
  timeTag: string,
  displayTimezone: DisplayTimezone,
): string {
  const ms = parseTimeTag(timeTag);
  if (Number.isNaN(ms)) return timeTag;
  const d = new Date(ms);
  if (displayTimezone === "utc") {
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()} ${hh}:${mm}${utcSuffix(displayTimezone)}`;
  }
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()} ${hh}:${mm}`;
}

/** The naive place-local shape Open-Meteo publishes: "YYYY-MM-DDTHH:MM". */
const PLACE_LOCAL_SHAPE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/**
 * Renders a naive place-local timestamp – Open-Meteo's native frame, e.g.
 * "2026-09-01T20:15" – in the Display timezone. The payload's fixed UTC
 * offset resolves the wall clock to the instant it denotes; the display
 * timezone then renders it like every other timestamp. Returns the raw
 * string when the timestamp does not match the wire shape (JS's lenient
 * Date parsing must not be allowed to guess).
 */
export function formatPlaceLocal(
  time: string,
  utcOffsetSeconds: number,
  displayTimezone: DisplayTimezone,
): string {
  if (!PLACE_LOCAL_SHAPE.test(time)) return time;
  const wallMs = Date.parse(`${time}:00Z`);
  if (Number.isNaN(wallMs)) return time;
  return formatClock(
    new Date(wallMs - utcOffsetSeconds * 1000),
    displayTimezone,
  );
}

/**
 * Formats the age of a live data timestamp relative to now: "just now",
 * "15m ago", "1h 5m ago". Relative ages carry no zone, so only the clock
 * is injected – pass `now` (epoch ms) to drive it from tests; production
 * callers omit it. Future or unparseable tags read as "just now".
 */
export function formatAge(timeTag: string, now: number = Date.now()): string {
  const then = parseTimeTag(timeTag);
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

/**
 * The two-line tick of the Forecast Kp chart – "Aug 18\n00:00" – naming the
 * 3-hour slot a tick stands for, in the Display timezone; the date line
 * follows the zone, so a slot that lands past the display zone's midnight
 * carries the zone's date. Compact, no suffix in either mode (see
 * formatClock). Returns the raw tag when the time cannot be parsed.
 */
export function formatSlotTick(
  timeTag: string,
  displayTimezone: DisplayTimezone,
): string {
  const ms = parseTimeTag(timeTag);
  if (Number.isNaN(ms)) return timeTag;
  const d = new Date(ms);
  if (displayTimezone === "utc") {
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mins = String(d.getUTCMinutes()).padStart(2, "0");
    return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}\n${hh}:${mins}`;
  }
  const hh = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}\n${hh}:${mins}`;
}

/** A calendar day, month 1-based, in some time zone's reckoning. */
export interface DayKey {
  year: number;
  month: number;
  day: number;
}

const dayKeyFormatters = new Map<string, Intl.DateTimeFormat>();

const dayKeyFormatter = (timeZone: string | undefined): Intl.DateTimeFormat =>
  cachedFormatter(dayKeyFormatters, timeZone, () =>
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      ...(timeZone ? { timeZone } : {}),
    }),
  );

/**
 * The calendar day an instant falls on in the Display timezone – the day
 * bucketing key. "Today" and the day-grouped tables key on this: a slot
 * belongs to the day its start falls in, so an instant past the zone's
 * midnight is filed under the zone's next day.
 */
export function dayKeyOf(
  date: Date,
  displayTimezone: DisplayTimezone,
): DayKey {
  const parts = dayKeyFormatter(
    displayTimezone === "utc" ? "UTC" : undefined,
  ).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** The day `days` away from the given day (calendar-true, month- and year-safe). */
export function addDays(key: DayKey, days: number): DayKey {
  const d = new Date(Date.UTC(key.year, key.month - 1, key.day + days));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

/**
 * The mini-table's day heading for a calendar day – "Wednesday\n26/08",
 * weekday and short date on two lines. The weekday belongs to the calendar
 * day itself and is the same in every zone, so it reads from the UTC
 * calendar of that day.
 */
export function formatDayLabel(key: DayKey): string {
  const d = new Date(Date.UTC(key.year, key.month - 1, key.day));
  const weekday = d.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${weekday}\n${dd}/${mm}`;
}

/** The short "Mon DD" day label, matching NOAA's own day names. */
export function formatShortDay(key: DayKey): string {
  return `${MONTHS_SHORT[key.month - 1]} ${key.day}`;
}

/**
 * The rendered Issued value of a forecast product page: the NOAA header
 * timestamp ("2026 Aug 23 1230 UTC" or "1830 UT 23 Aug 2026") in the
 * Display timezone, always carrying the short date – an Issued line is a
 * dated fact, not a freshness reading, so "Aug 23 12:30 UTC" (UTC mode)
 * and "Aug 23 14:30" (Local) both state the day. The " UTC" suffix follows
 * the module's one zone-noise rule. Returns the raw string when the shape
 * is unexpected – an issued line is never worth throwing over.
 */
export function formatIssued(
  issued: string,
  displayTimezone: DisplayTimezone,
): string {
  let date: Date;
  try {
    date = parseIssuedDate(issued);
  } catch {
    return issued;
  }
  const day =
    displayTimezone === "utc"
      ? `${MONTHS_SHORT[date.getUTCMonth()]} ${date.getUTCDate()}`
      : `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
  return `${day} ${formatClock(date, displayTimezone)}${utcSuffix(displayTimezone)}`;
}

// The 3-hour slots of NOAA's indices are aligned to the UTC day.
const SLOT_MS = 3 * 60 * 60 * 1000;

/**
 * The "HH:MM - HH:MM" range of the 3-hour slot containing the instant, in
 * the Display timezone – the Aurora Now current-window chip. UTC mode keeps
 * the " UTC" suffix; Local mode is bare. The slot grid itself stays UTC
 * (instant-based, the same slot in both modes); only the labels convert.
 * A slot ending at the rendered zone's midnight keeps the "24:00" end
 * label (the day's last slot reads "21:00 - 24:00 UTC", as before).
 * Renders an empty label when the time cannot be parsed.
 */
export function formatSlot(
  timeTag: string,
  displayTimezone: DisplayTimezone,
): string {
  const ms = parseTimeTag(timeTag);
  if (Number.isNaN(ms)) return "";
  const start = Math.floor(ms / SLOT_MS) * SLOT_MS;
  const startClock = formatClock(new Date(start), displayTimezone);
  const endClock = formatClock(new Date(start + SLOT_MS), displayTimezone);
  const suffix = utcSuffix(displayTimezone);
  return `${startClock} - ${endClock === "00:00" ? "24:00" : endClock}${suffix}`;
}
