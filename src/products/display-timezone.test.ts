import { beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_DISPLAY_TIMEZONE,
  DISPLAY_TIMEZONE_STORAGE_KEY,
  loadDisplayTimezone,
  saveDisplayTimezone,
} from "./display-timezone";

describe("Display timezone storage (ticket 02)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to Local when nothing is stored", () => {
    expect(loadDisplayTimezone(localStorage)).toBe("local");
    expect(DEFAULT_DISPLAY_TIMEZONE).toBe("local");
  });

  it("round-trips the choice as a versioned value", () => {
    saveDisplayTimezone(localStorage, "utc");
    expect(localStorage.getItem(DISPLAY_TIMEZONE_STORAGE_KEY)).toBe(
      JSON.stringify({ timezone: "utc", v: 1 }),
    );
    expect(loadDisplayTimezone(localStorage)).toBe("utc");
    saveDisplayTimezone(localStorage, "local");
    expect(loadDisplayTimezone(localStorage)).toBe("local");
  });

  it("falls back to Local on corrupt or foreign-shaped storage", () => {
    localStorage.setItem(DISPLAY_TIMEZONE_STORAGE_KEY, "not json");
    expect(loadDisplayTimezone(localStorage)).toBe("local");
    localStorage.setItem(
      DISPLAY_TIMEZONE_STORAGE_KEY,
      JSON.stringify({ v: 1 }),
    );
    expect(loadDisplayTimezone(localStorage)).toBe("local");
    // The setting is strictly two-state: anything else is foreign shape
    localStorage.setItem(
      DISPLAY_TIMEZONE_STORAGE_KEY,
      JSON.stringify({ timezone: "both", v: 1 }),
    );
    expect(loadDisplayTimezone(localStorage)).toBe("local");
    localStorage.setItem(
      DISPLAY_TIMEZONE_STORAGE_KEY,
      JSON.stringify({ timezone: "utc", v: 99 }),
    );
    expect(loadDisplayTimezone(localStorage)).toBe("local");
  });
});
