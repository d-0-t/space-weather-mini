// The device-time-zone formatting is asserted against one pinned zone
// (Sweden, UTC+2 in September) so every expectation is deterministic.
process.env.TZ = "Europe/Stockholm";

import { describe, expect, it } from "vitest";

import {
  addDays,
  dayKeyOf,
  formatAge,
  formatClock,
  formatClockTick,
  formatDayLabel,
  formatIssued,
  formatPlaceLocal,
  formatShort,
  formatShortDay,
  formatSlot,
  formatSlotTick,
  formatTooltipTimestamp,
  MONTHS_SHORT,
  parseTimeTag,
  utcSuffix,
} from "./display-time";

describe("parseTimeTag (ticket 05)", () => {
  it("parses every SWPC wire shape as UTC to the same epoch", () => {
    expect(parseTimeTag("2026-08-25T18:00:00Z")).toBe(
      new Date("2026-08-25T18:00:00Z").getTime(),
    );
    expect(parseTimeTag("2026-08-25T18:00:00")).toBe(
      new Date("2026-08-25T18:00:00Z").getTime(),
    );
    expect(parseTimeTag("2026-08-28 15:02:40.837")).toBe(
      new Date("2026-08-28T15:02:40.837Z").getTime(),
    );
    expect(parseTimeTag("2026-08-26_21:00")).toBe(
      new Date("2026-08-26T21:00:00Z").getTime(),
    );
  });

  it("returns NaN for unparseable times", () => {
    expect(Number.isNaN(parseTimeTag("not a time"))).toBe(true);
  });
});

describe("MONTHS_SHORT (ticket 05)", () => {
  it("is the single shared short-month table in NOAA order", () => {
    expect(MONTHS_SHORT).toEqual([
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
    ]);
  });
});

describe("utcSuffix (ticket 03)", () => {
  it("carries the zone-noise rule in one place", () => {
    expect(utcSuffix("utc")).toBe(" UTC");
    expect(utcSuffix("local")).toBe("");
  });
});

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

describe("formatClockTick (ticket 03)", () => {
  it("labels a chart tick with the display-zone HH:MM in both modes", () => {
    // 22:04 UTC is 00:04 the next day in Stockholm – the tick crosses midnight
    expect(formatClockTick("2026-08-26T22:04:07", "local")).toBe("00:04");
    expect(formatClockTick("2026-08-26T22:04:07", "utc")).toBe("22:04");
  });

  it("parses every wire shape: T, space and underscore separators, with or without Z", () => {
    expect(formatClockTick("2026-08-26 22:04", "utc")).toBe("22:04");
    expect(formatClockTick("2026-08-26_21:00", "utc")).toBe("21:00");
    expect(formatClockTick("2026-08-26T21:00:00Z", "utc")).toBe("21:00");
  });

  it("renders an empty label when the time cannot be parsed", () => {
    expect(formatClockTick("not a time", "utc")).toBe("");
    expect(formatClockTick("", "local")).toBe("");
  });
});

describe("formatTooltipTimestamp (ticket 03)", () => {
  it("renders the tooltip timestamp in the display zone, with ' UTC' only in UTC mode", () => {
    expect(formatTooltipTimestamp("2026-08-26T22:04:07", "utc")).toBe(
      "26 Aug 2026 22:04 UTC",
    );
    // 22:04 UTC is 00:04 the next day in Stockholm
    expect(formatTooltipTimestamp("2026-08-26T22:04:07", "local")).toBe(
      "27 Aug 2026 00:04",
    );
    expect(formatTooltipTimestamp("2026-08-26_21:00", "utc")).toBe(
      "26 Aug 2026 21:00 UTC",
    );
  });

  it("returns the raw tag when the time cannot be parsed, in both modes", () => {
    expect(formatTooltipTimestamp("nope", "utc")).toBe("nope");
    expect(formatTooltipTimestamp("nope", "local")).toBe("nope");
  });
});

describe("formatSlotTick (ticket 03)", () => {
  it("renders the Kp chart's two-line tick in the display zone", () => {
    expect(formatSlotTick("2026-08-18T00:00:00", "utc")).toBe(
      "Aug 18\n00:00",
    );
    // 00:00 UTC is 02:00 in Stockholm, same calendar day
    expect(formatSlotTick("2026-08-18T00:00:00", "local")).toBe(
      "Aug 18\n02:00",
    );
  });

  it("lets the date follow the zone when the display zone crosses midnight", () => {
    // 23:00 UTC is 01:00 the next day in Stockholm
    expect(formatSlotTick("2026-08-18T23:00:00", "local")).toBe(
      "Aug 19\n01:00",
    );
  });

  it("returns the raw tag when the time cannot be parsed, in both modes", () => {
    expect(formatSlotTick("nope", "utc")).toBe("nope");
    expect(formatSlotTick("nope", "local")).toBe("nope");
  });
});

describe("formatSlot (ticket 03)", () => {
  it("labels the 3-hour slot containing the instant, in the chosen timezone", () => {
    // 12:47 UTC sits in the 12-15 UT slot; 14:00-17:00 in Stockholm
    expect(formatSlot("2026-08-25T12:47:00Z", "utc")).toBe(
      "12:00 - 15:00 UTC",
    );
    expect(formatSlot("2026-08-25T12:47:00Z", "local")).toBe("14:00 - 17:00");
  });

  it("keeps the '24:00' end label when the slot ends at the zone's midnight", () => {
    // The day's last UTC slot ends at 24:00, as the chip has always read.
    expect(formatSlot("2026-08-25T21:30:00Z", "utc")).toBe(
      "21:00 - 24:00 UTC",
    );
    // The rule is about the rendered zone's midnight, not UTC's: it applies
    // in Local mode too when the device zone makes a slot end at midnight.
  });

  it("crosses the zone's midnight without a date in either mode", () => {
    // The 21-24 UT slot is 23:00-02:00 in Stockholm
    expect(formatSlot("2026-08-25T21:30:00Z", "local")).toBe("23:00 - 02:00");
  });

  it("renders an empty label when the time cannot be parsed", () => {
    expect(formatSlot("not a time", "utc")).toBe("");
  });
});

describe("day keys (ticket 03)", () => {
  // "Today" is the Display timezone's calendar day, and a slot belongs to
  // the day its start falls in – so bucketing keys on the zone's calendar
  // day of the instant.
  it("keys an instant to the display timezone's calendar day", () => {
    expect(dayKeyOf(new Date("2026-08-26T12:00:00Z"), "local")).toEqual({
      year: 2026,
      month: 8,
      day: 26,
    });
    expect(dayKeyOf(new Date("2026-08-26T12:00:00Z"), "utc")).toEqual({
      year: 2026,
      month: 8,
      day: 26,
    });
  });

  it("files a slot that starts past the zone's midnight under its start day", () => {
    // 23:00 UTC is 01:00 the next day in Stockholm – the 23-02 slot belongs
    // to the 27th, the day its start falls in.
    expect(dayKeyOf(new Date("2026-08-26T23:00:00Z"), "local")).toEqual({
      year: 2026,
      month: 8,
      day: 27,
    });
    expect(dayKeyOf(new Date("2026-08-26T23:00:00Z"), "utc")).toEqual({
      year: 2026,
      month: 8,
      day: 26,
    });
  });

  it("shifts keys across month and year boundaries", () => {
    expect(addDays({ year: 2026, month: 8, day: 31 }, 1)).toEqual({
      year: 2026,
      month: 9,
      day: 1,
    });
    expect(addDays({ year: 2026, month: 12, day: 31 }, 1)).toEqual({
      year: 2027,
      month: 1,
      day: 1,
    });
    expect(addDays({ year: 2026, month: 3, day: 1 }, -1)).toEqual({
      year: 2026,
      month: 2,
      day: 28,
    });
  });

  it("formats the table's day heading with weekday and DD/MM on two lines", () => {
    // Aug 26 2026 is a Wednesday
    expect(formatDayLabel({ year: 2026, month: 8, day: 26 })).toBe(
      "Wednesday\n26/08",
    );
  });

  it("formats the short day label in the NOAA 'Mon DD' shape", () => {
    expect(formatShortDay({ year: 2026, month: 8, day: 26 })).toBe("Aug 26");
  });
});

describe("formatIssued (ticket 04)", () => {
  it("renders the NOAA issued shape with date, clock and ' UTC' suffix in UTC mode", () => {
    expect(formatIssued("2026 Aug 23 1230 UTC", "utc")).toBe("Aug 23 12:30 UTC");
    expect(formatIssued("1830 UT 23 Aug 2026", "utc")).toBe("Aug 23 18:30 UTC");
  });

  it("renders the device-zone date and clock in Local mode", () => {
    // 1230 UTC is 14:30 in Stockholm (UTC+2)
    expect(formatIssued("2026 Aug 23 1230 UTC", "local")).toBe("Aug 23 14:30");
    expect(formatIssued("1830 UT 23 Aug 2026", "local")).toBe("Aug 23 20:30");
  });

  it("carries the device-zone date when the issued time crosses midnight", () => {
    // 2230 UTC is 00:30 the next day in Stockholm – the date follows the zone
    expect(formatIssued("2026 Aug 23 2230 UTC", "local")).toBe("Aug 24 00:30");
  });

  it("returns the raw string when the issued shape is unexpected, in both modes", () => {
    expect(formatIssued("nope", "utc")).toBe("nope");
    expect(formatIssued("nope", "local")).toBe("nope");
  });
});

describe("formatAge (ticket 03)", () => {
  // The injected now is the clock seam: relative ages stay zone-free, and
  // the tests drive the clock instead of mocking Date.now.
  const now = new Date("2026-08-25T18:00:00Z").getTime();

  it("formats the age relative to the injected now", () => {
    expect(formatAge("2026-08-25T17:45:00Z", now)).toBe("15m ago");
    expect(formatAge("2026-08-25T16:55:00Z", now)).toBe("1h 5m ago");
    expect(formatAge("2026-08-25T15:00:00Z", now)).toBe("3h 0m ago");
  });

  it("reads 'just now' inside the first minute, and for future or unparseable tags", () => {
    expect(formatAge("2026-08-25T17:59:30Z", now)).toBe("just now");
    expect(formatAge("2026-08-25T18:05:00Z", now)).toBe("just now");
    expect(formatAge("not a time", now)).toBe("just now");
  });
});
