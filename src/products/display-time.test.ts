// The device-time-zone formatting is asserted against one pinned zone
// (Sweden, UTC+2 in September) so every expectation is deterministic.
process.env.TZ = "Europe/Stockholm";

import { describe, expect, it } from "vitest";

import {
  formatClock,
  formatPlaceLocal,
  formatShort,
} from "./display-time";

describe("formatShort (ticket 02)", () => {
  it("renders 'Aug 26 16:36 UTC' in UTC mode – the NOAA-legacy shape with suffix", () => {
    expect(formatShort("2026-08-26 16:36:10.973", "utc")).toBe(
      "Aug 26 16:36 UTC",
    );
    expect(formatShort("2026-08-28T21:00:00", "utc")).toBe(
      "Aug 28 21:00 UTC",
    );
    expect(formatShort("2026-12-01T09:05:00Z", "utc")).toBe(
      "Dec 1 09:05 UTC",
    );
  });

  it("renders the device clock bare in Local mode – no zone suffix", () => {
    // 14:33 UTC is 16:33 in Stockholm (UTC+2), same calendar day
    expect(formatShort("2026-09-04T14:33:00Z", "local")).toBe("16:33");
  });

  it("adds the device-zone date in Local mode when the zone crosses midnight", () => {
    // 22:40 UTC is 00:40 the next day in Stockholm
    expect(formatShort("2026-09-06T22:40:00Z", "local")).toBe("Sep 7 00:40");
  });

  it("returns the raw string when the time cannot be parsed, in both modes", () => {
    expect(formatShort("not a time", "utc")).toBe("not a time");
    expect(formatShort("not a time", "local")).toBe("not a time");
    expect(formatShort("–", "local")).toBe("–");
  });
});

describe("formatClock (ticket 02)", () => {
  const instant = new Date("2026-09-04T14:33:00Z");

  it("labels an instant with the device-zone HH:MM in Local mode", () => {
    expect(formatClock(instant, "local")).toBe("16:33");
  });

  it("labels an instant with the UTC HH:MM in UTC mode", () => {
    expect(formatClock(instant, "utc")).toBe("14:33");
  });
});

describe("formatPlaceLocal (ticket 02)", () => {
  // A naive Open-Meteo timestamp is the place's wall clock; the payload's
  // fixed UTC offset resolves it to the instant it denotes.
  it("renders the resolved instant in the display timezone", () => {
    // 14:00 Kiruna (UTC+2) = 12:00 UTC = 14:00 in Stockholm
    expect(formatPlaceLocal("2026-09-01T14:00", 7200, "local")).toBe("14:00");
    expect(formatPlaceLocal("2026-09-01T14:00", 7200, "utc")).toBe("12:00");
  });

  it("resolves a negative offset, crossing the UTC day backwards", () => {
    // 20:15 at UTC-5 is 01:15 the next UTC day
    expect(formatPlaceLocal("2026-09-01T20:15", -18000, "utc")).toBe("01:15");
    expect(formatPlaceLocal("2026-09-01T20:15", -18000, "local")).toBe("03:15");
  });

  it("returns the raw string when the timestamp cannot be parsed", () => {
    expect(formatPlaceLocal("nope", 7200, "utc")).toBe("nope");
  });
});
