/**
 * Parsing helpers shared by the products' data layer. The rendering
 * formatters moved to the display-time module (ticket 03); these thin
 * shims keep the old import path alive until ticket 05 sweeps the
 * remaining callers onto the module.
 */

import { formatShort } from "./display-time";

import { parseTimeTag } from "./display-time";

/**
 * Parses a SWPC time string (ISO with or without trailing Z, or
 * "YYYY-MM-DD HH:MM" style, always UTC) to epoch milliseconds.
 * Returns NaN when the time cannot be parsed.
 */
export const toEpoch = parseTimeTag;

/** Legacy single-mode names over the display-time module. */
export const formatUtcShort = (timeTag: string): string =>
  formatShort(timeTag, "utc");

/** Legacy single-mode names over the display-time module. */
export const formatLocalShort = (timeTag: string): string =>
  formatShort(timeTag, "local");

export { formatAge } from "./display-time";
