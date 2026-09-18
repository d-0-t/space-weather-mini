process.env.TZ = "UTC";

import { describe, expect, it } from "vitest";

import { matchDailyOutlook } from "./daily-outlook";
import type { PlanetaryKForecastPoint } from "../products/noaa-planetary-k-index";

const forecastPoint = (
  timeTag: string,
  kp: number,
  observed: PlanetaryKForecastPoint["observed"] = "predicted",
): PlanetaryKForecastPoint => ({
  time_tag: timeTag,
  kp,
  observed,
  noaa_scale: null,
});

const LULEA = { latitude: 65.5848, longitude: 22.1546, shortName: "Luleå" };

/** 2026-09-18 08:30 Luleå – inside the morning–lunch send window. */
const NOW = Date.parse("2026-09-18T06:30:00Z");

describe("the Daily outlook alert matcher (ticket 04)", () => {
  it("pokes in the send window with tonight's expected Kp and the darkest window at the stored place", () => {
    const events = matchDailyOutlook({
      forecast: [
        forecastPoint("2026-09-18T21:00:00", 5.33),
        forecastPoint("2026-09-19T00:00:00", 5.67),
      ],
      place: LULEA,
      placeTimezone: "Europe/Stockholm",
      alertThreshold: 5,
      seenKeys: [],
      now: NOW,
    });
    expect(events).toEqual([
      {
        key: "daily-outlook|2026-09-18",
        poke: true,
        title: "Tonight Kp 5.67 expected",
        body: "Darkest at Luleå 22:01–02:50.",
      },
    ]);
  });

  it("stays silent outside the morning–lunch send window", () => {
    const events = matchDailyOutlook({
      forecast: [forecastPoint("2026-09-18T21:00:00", 4.33)],
      place: LULEA,
      placeTimezone: "Europe/Stockholm",
      alertThreshold: 5,
      seenKeys: [],
      now: Date.parse("2026-09-18T14:30:00Z"),
    });
    expect(events).toEqual([]);
  });

  it("labels the predicted Kp by its forecast value in the copy", () => {
    const events = matchDailyOutlook({
      forecast: [forecastPoint("2026-09-18T21:00:00", 5.33)],
      place: LULEA,
      placeTimezone: "Europe/Stockholm",
      alertThreshold: 5,
      seenKeys: [],
      now: NOW,
    });
    expect(events).toEqual([
      expect.objectContaining({
        title: "Tonight Kp 5.33 expected",
        body: "Darkest at Luleå 22:01–02:50.",
      }),
    ]);
  });

  it("stays silent when no threshold-relevant activity is forecast", () => {
    const events = matchDailyOutlook({
      forecast: [
        forecastPoint("2026-09-18T21:00:00", 3.33),
        forecastPoint("2026-09-19T00:00:00", 4.67),
      ],
      place: LULEA,
      placeTimezone: "Europe/Stockholm",
      alertThreshold: 5,
      seenKeys: [],
      now: NOW,
    });
    expect(events).toEqual([]);
  });

  it("stays silent on a midnight-sun day, when no dark stretch exists tonight", () => {
    const events = matchDailyOutlook({
      forecast: [forecastPoint("2026-06-21T21:00:00", 5.33)],
      place: { latitude: 78.22, longitude: 15.63, shortName: "Longyearbyen" },
      placeTimezone: "Arctic/Longyearbyen",
      alertThreshold: 5,
      seenKeys: [],
      now: Date.parse("2026-06-21T09:30:00Z"),
    });
    expect(events).toEqual([]);
  });

  it("names the all-day darkness on a deep polar-night day", () => {
    const events = matchDailyOutlook({
      forecast: [forecastPoint("2026-12-21T21:00:00", 5.33)],
      place: { latitude: 85, longitude: 15.63, shortName: "North Pole" },
      placeTimezone: "UTC",
      alertThreshold: 5,
      seenKeys: [],
      now: Date.parse("2026-12-21T09:30:00Z"),
    });
    expect(events).toEqual([
      {
        key: "daily-outlook|2026-12-21",
        poke: true,
        title: "Tonight Kp 5.33 expected",
        body: "Darkest at North Pole: all day.",
      },
    ]);
  });

  it("stays silent on the second poll of the same place-local day", () => {
    const events = matchDailyOutlook({
      forecast: [forecastPoint("2026-09-18T21:00:00", 5.33)],
      place: LULEA,
      placeTimezone: "Europe/Stockholm",
      alertThreshold: 5,
      seenKeys: ["daily-outlook|2026-09-18"],
      now: Date.parse("2026-09-18T08:00:00Z"),
    });
    expect(events).toEqual([]);
  });

  it("pokes again the next place-local day, after local dawn", () => {
    const events = matchDailyOutlook({
      forecast: [forecastPoint("2026-09-19T21:00:00", 5.33)],
      place: LULEA,
      placeTimezone: "Europe/Stockholm",
      alertThreshold: 5,
      seenKeys: ["daily-outlook|2026-09-18"],
      now: Date.parse("2026-09-19T06:30:00Z"),
    });
    expect(events).toEqual([
      expect.objectContaining({ key: "daily-outlook|2026-09-19" }),
    ]);
  });

  it("stays silent outside the send window even when today was already poked", () => {
    const events = matchDailyOutlook({
      forecast: [forecastPoint("2026-09-18T21:00:00", 5.33)],
      place: LULEA,
      placeTimezone: "Europe/Stockholm",
      alertThreshold: 5,
      seenKeys: ["daily-outlook|2026-09-18"],
      now: Date.parse("2026-09-18T14:30:00Z"),
    });
    expect(events).toEqual([]);
  });

  it("renders the coming night's window in the stored place's timezone, not the device zone", () => {
    // Tokyo's night window on 2026-09-19 runs 19:08 to 04:01 (next day) local.
    const events = matchDailyOutlook({
      forecast: [forecastPoint("2026-09-19T12:00:00", 5.33)],
      place: { latitude: 35.68, longitude: 139.69, shortName: "Tokyo" },
      placeTimezone: "Asia/Tokyo",
      alertThreshold: 5,
      seenKeys: [],
      now: Date.parse("2026-09-18T22:30:00Z"),
    });
    expect(events).toEqual([
      {
        key: "daily-outlook|2026-09-19",
        poke: true,
        title: "Tonight Kp 5.33 expected",
        body: "Darkest at Tokyo 19:08–04:01.",
      },
    ]);
  });

  it("stays silent on the quiet day after dawn so the outlook describes the coming night, never the night just past", () => {
    // 07:30 Luleå on 2026-09-19: the day key has rolled to the 19th, and
    // tonight's window (the evening of the 19th) is what gets described.
    const events = matchDailyOutlook({
      forecast: [forecastPoint("2026-09-18T21:00:00", 4.33)],
      place: LULEA,
      placeTimezone: "Europe/Stockholm",
      alertThreshold: 5,
      seenKeys: ["daily-outlook|2026-09-18"],
      now: Date.parse("2026-09-19T05:30:00Z"),
    });
    expect(events).toEqual([]);
  });
});
