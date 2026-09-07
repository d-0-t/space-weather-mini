/**
 * The display-time module (ticket 02): the single owner of absolute-time
 * rendering. Every absolute timestamp the app shows is formatted here, in
 * the chosen Display timezone – short absolute strings, clock labels and
 * place-local conversions. Only one zone is ever shown per fact: UTC mode
 * keeps the " UTC" suffix chasers expect, Local mode goes quiet about zones.
 * Relative ages carry no zone and live with their surfaces.
 */

import type { DisplayTimezone } from "./display-timezone";
import { formatLocalShort, formatUtcShort } from "./live-helpers";

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
  return displayTimezone === "utc"
    ? formatUtcShort(timeTag)
    : formatLocalShort(timeTag);
}

const clockFormatters = new Map<string, Intl.DateTimeFormat>();

/** HH:MM formatter for a time zone (undefined = the device zone), cached. */
const clockFormatter = (timeZone: string | undefined): Intl.DateTimeFormat => {
  const key = timeZone ?? "";
  let formatter = clockFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      ...(timeZone ? { timeZone } : {}),
    });
    clockFormatters.set(key, formatter);
  }
  return formatter;
};

/**
 * The HH:MM clock label for an instant in the Display timezone – chart
 * ticks, timeline bands, webcam stamps. 2-digit, 24-hour, no suffix in
 * either mode (Local mode's clock is the visitor's own, UTC mode's is
 * unambiguous without a suffix next to other " UTC" stamps).
 */
export function formatClock(
  date: Date,
  displayTimezone: DisplayTimezone,
): string {
  return clockFormatter(
    displayTimezone === "utc" ? "UTC" : undefined,
  ).format(date);
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
