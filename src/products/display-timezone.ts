/**
 * The Display timezone setting (ticket 02): a two-state value – Local (the
 * device zone, the default) or UTC – persisted versioned so the chaser never
 * chooses it twice (spec user story 4).
 */

export type DisplayTimezone = "local" | "utc";

export const DEFAULT_DISPLAY_TIMEZONE: DisplayTimezone = "local";

export const DISPLAY_TIMEZONE_STORAGE_KEY = "sw:display-timezone:v1";

const isDisplayTimezone = (value: unknown): value is DisplayTimezone =>
  value === "local" || value === "utc";

/**
 * Loads the persisted Display timezone, defaulting to Local when missing,
 * corrupt, or stored under an unknown version or value.
 */
export function loadDisplayTimezone(
  storage: Pick<Storage, "getItem">,
): DisplayTimezone {
  try {
    const raw = storage.getItem(DISPLAY_TIMEZONE_STORAGE_KEY);
    if (!raw) return DEFAULT_DISPLAY_TIMEZONE;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return DEFAULT_DISPLAY_TIMEZONE;
    }
    const { timezone, v } = parsed as Record<string, unknown>;
    if (v !== 1 || !isDisplayTimezone(timezone)) {
      return DEFAULT_DISPLAY_TIMEZONE;
    }
    return timezone;
  } catch {
    return DEFAULT_DISPLAY_TIMEZONE;
  }
}

/** Persists the Display timezone as a versioned value. */
export function saveDisplayTimezone(
  storage: Pick<Storage, "setItem">,
  displayTimezone: DisplayTimezone,
): void {
  storage.setItem(
    DISPLAY_TIMEZONE_STORAGE_KEY,
    JSON.stringify({ timezone: displayTimezone, v: 1 }),
  );
}
