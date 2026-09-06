// The device-time-zone formatting is asserted against one pinned zone
// (Sweden, UTC+1/+2) so every expectation is deterministic.
process.env.TZ = "Europe/Stockholm";

import { describe, expect, it, vi } from "vitest";
import { formatAge, formatLocalShort, formatUtcShort, toEpoch } from "./live-helpers";

describe("formatUtcShort", () => {
  it("formats SWPC UTC times as 'Aug 26 16:36 UTC'", () => {
    expect(formatUtcShort("2026-08-26 16:36:10.973")).toBe("Aug 26 16:36 UTC");
    expect(formatUtcShort("2026-08-28T21:00:00")).toBe("Aug 28 21:00 UTC");
    expect(formatUtcShort("2026-12-01T09:05:00Z")).toBe("Dec 1 09:05 UTC");
  });

  it("returns the raw string when the time cannot be parsed", () => {
    expect(formatUtcShort("not a time")).toBe("not a time");
  });
});

describe("formatLocalShort", () => {
  it("formats device-local time as bare 'HH:MM' on the same local date", () => {
    // 14:33 UTC is 16:33 in Stockholm (UTC+2 in September), same day.
    expect(formatLocalShort("2026-09-04T14:33:00Z")).toBe("16:33");
  });

  it("adds the local date when the zone pushes it across midnight", () => {
    // 22:40 UTC is 00:40 the next day in Stockholm.
    expect(formatLocalShort("2026-09-06T22:40:00Z")).toBe("Sep 7 00:40");
  });

  it("returns the raw string when the time cannot be parsed", () => {
    expect(formatLocalShort("not a time")).toBe("not a time");
  });
});

describe("toEpoch", () => {
  it("parses ISO times with or without Z and space-separated SWPC times", () => {
    expect(toEpoch("2026-08-25T18:00:00Z")).toBe(
      new Date("2026-08-25T18:00:00Z").getTime(),
    );
    expect(toEpoch("2026-08-25T18:00:00")).toBe(
      new Date("2026-08-25T18:00:00Z").getTime(),
    );
    expect(toEpoch("2026-08-28 15:02:40.837")).toBe(
      new Date("2026-08-28T15:02:40.837Z").getTime(),
    );
  });

  it("returns NaN for unparseable times", () => {
    expect(Number.isNaN(toEpoch("not a time"))).toBe(true);
  });
});

describe("formatAge", () => {
  it("returns 'just now' for timestamps within 60 seconds", () => {
    const now = new Date("2026-08-25T18:00:00Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);
    expect(formatAge("2026-08-25T17:59:30Z")).toBe("just now");
    vi.restoreAllMocks();
  });

  it("formats minutes ago", () => {
    const now = new Date("2026-08-25T18:00:00Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);
    expect(formatAge("2026-08-25T17:58:00Z")).toBe("2m ago");
    expect(formatAge("2026-08-25T17:45:00Z")).toBe("15m ago");
    vi.restoreAllMocks();
  });

  it("formats hours and minutes", () => {
    const now = new Date("2026-08-25T18:00:00Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);
    expect(formatAge("2026-08-25T16:55:00Z")).toBe("1h 5m ago");
    expect(formatAge("2026-08-25T15:00:00Z")).toBe("3h 0m ago");
    vi.restoreAllMocks();
  });

  it("handles time_tag without Z (assumes UTC)", () => {
    const now = new Date("2026-08-25T18:00:00Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);
    expect(formatAge("2026-08-25T17:45:00")).toBe("15m ago");
    vi.restoreAllMocks();
  });

  it("returns 'just now' for future timestamps (clock skew)", () => {
    const now = new Date("2026-08-25T18:00:00Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);
    expect(formatAge("2026-08-25T18:05:00Z")).toBe("just now");
    vi.restoreAllMocks();
  });
});
