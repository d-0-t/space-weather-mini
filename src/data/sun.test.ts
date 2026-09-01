// daylightTimes derives its day from the device-local calendar day of the
// passed instant; pinning UTC keeps the pinned literals deterministic on
// any host.
process.env.TZ = "UTC";

import { describe, expect, it } from "vitest";

import { daylightTimes, isSunBelowHorizon, solarElevationDegrees } from "./sun";

/**
 * Expected times are pinned to sunrise-sunset.org v2 (NOAA model) literals,
 * fetched live on 2026-09-01 and recorded in
 * docs/research/aurora-local-conditions-2026-09-01.md. suncalc and NOAA use
 * different solar models that agree within ~3 minutes, so each event is
 * asserted inside a 3 minute window around the independent literal.
 */
const expectNearMinutes = (
  actual: Date | null,
  isoExpected: string,
  toleranceMinutes = 3,
): void => {
  expect(actual).not.toBeNull();
  const delta = Math.abs(
    (actual as Date).getTime() - Date.parse(isoExpected),
  );
  expect(delta).toBeLessThanOrEqual(toleranceMinutes * 60_000);
};

describe("solar elevation (NOAA approximation)", () => {
  it("puts the sun near the zenith at the equator at noon on the equinox", () => {
    const elevation = solarElevationDegrees(0, 0, new Date("2026-03-20T12:00:00Z"));
    expect(elevation).toBeGreaterThan(88);
    expect(elevation).toBeLessThanOrEqual(90);
  });

  it("puts the sun at the winter-solstice noontime height at the equator", () => {
    // Declination ≈ −23.44° at the December solstice → zenith distance ≈ 23.4°
    const elevation = solarElevationDegrees(0, 0, new Date("2026-12-21T12:00:00Z"));
    expect(elevation).toBeGreaterThan(66);
    expect(elevation).toBeLessThan(67);
  });

  it("keeps the midnight sun above the horizon at Tromsø on the summer solstice", () => {
    expect(isSunBelowHorizon(69.65, 18.96, new Date("2026-06-21T12:00:00Z"))).toBe(
      false,
    );
  });

  it("keeps the polar night below the horizon at Tromsø on the winter solstice", () => {
    expect(isSunBelowHorizon(69.65, 18.96, new Date("2026-12-21T12:00:00Z"))).toBe(
      true,
    );
  });
});

describe("isSunBelowHorizon – actual sunrise/sunset of the day", () => {
  // Hope, NJ (40.9°N, −74.97°E): mid-July sunrise ≈ 09:40 UTC, sunset ≈ 00:30 UTC next day
  const hope = { latitude: 40.9, longitude: -74.97 };

  it("is below the horizon before local sunrise and above it after", () => {
    expect(isSunBelowHorizon(hope.latitude, hope.longitude, new Date("2026-07-15T09:00:00Z"))).toBe(true);
    expect(isSunBelowHorizon(hope.latitude, hope.longitude, new Date("2026-07-15T10:30:00Z"))).toBe(false);
  });

  it("is above the horizon before local sunset and below it after", () => {
    expect(isSunBelowHorizon(hope.latitude, hope.longitude, new Date("2026-07-15T23:00:00Z"))).toBe(false);
    expect(isSunBelowHorizon(hope.latitude, hope.longitude, new Date("2026-07-16T01:30:00Z"))).toBe(true);
  });

  it("counts twilight as dark (sun below the horizon, elevation between −6° and 0°)", () => {
    // 09:00 UTC sits in morning civil twilight – aurora can still be on
    const elevation = solarElevationDegrees(hope.latitude, hope.longitude, new Date("2026-07-15T09:00:00Z"));
    expect(elevation).toBeLessThan(0);
    expect(elevation).toBeGreaterThan(-8);
  });

  it("follows western longitudes (local solar time behind UTC)", () => {
    // Yellowknife (62.45°N, −114.37°E), 2026-01-15: 20:00 UTC = ~13:00 local
    expect(isSunBelowHorizon(62.45, -114.37, new Date("2026-01-15T20:00:00Z"))).toBe(false);
    // 03:00 UTC = ~20:00 local – deep winter night
    expect(isSunBelowHorizon(62.45, -114.37, new Date("2026-01-15T03:00:00Z"))).toBe(true);
  });
});

describe("daylightTimes (suncalc) for Local conditions", () => {
  const OSLO = { latitude: 59.91, longitude: 10.75 };

  it("pins the full Oslo event set for 2026-09-15 against NOAA literals", () => {
    const { today } = daylightTimes(
      OSLO.latitude,
      OSLO.longitude,
      new Date("2026-09-15T00:00:00Z"),
    );
    expectNearMinutes(today.sunrise, "2026-09-15T04:43:11Z");
    expectNearMinutes(today.sunset, "2026-09-15T17:41:14Z");
    expectNearMinutes(today.solarNoon, "2026-09-15T11:12:12Z");
    expectNearMinutes(today.civilDawn, "2026-09-15T04:03:09Z");
    expectNearMinutes(today.civilDusk, "2026-09-15T18:21:16Z");
    expectNearMinutes(today.nauticalDawn, "2026-09-15T03:11:21Z");
    expectNearMinutes(today.nauticalDusk, "2026-09-15T19:13:04Z");
    expectNearMinutes(today.astronomicalDawn, "2026-09-15T02:12:50Z");
    expectNearMinutes(today.astronomicalDusk, "2026-09-15T20:11:35Z");
    // Day length 12 h 58 m per NOAA (46 683 s); suncalc reads ~4 min shorter
    expect(today.dayLengthMinutes).toBeGreaterThan(770);
    expect(today.dayLengthMinutes).toBeLessThan(786);
  });

  it("anchors the dark window between today's astronomical dusk and tomorrow's astronomical dawn", () => {
    const { today, tomorrow } = daylightTimes(
      OSLO.latitude,
      OSLO.longitude,
      new Date("2026-09-15T00:00:00Z"),
    );
    expect(today.darkWindowStart).not.toBeNull();
    expect(today.darkWindowEnd).not.toBeNull();
    expect(today.darkWindowStart!.getTime()).toBe(
      today.astronomicalDusk!.getTime(),
    );
    expect(today.darkWindowEnd!.getTime()).toBe(
      tomorrow.astronomicalDawn!.getTime(),
    );
    expect(today.darkWindowEnd!.getTime()).toBeGreaterThan(
      today.darkWindowStart!.getTime(),
    );
    expect(today.polar).toBeNull();
    expect(tomorrow.polar).toBeNull();
  });

  it("shifts today's events one day for tomorrow, later in mid-September", () => {
    const { today, tomorrow } = daylightTimes(
      OSLO.latitude,
      OSLO.longitude,
      new Date("2026-09-15T00:00:00Z"),
    );
    expect(tomorrow.date.getTime() - today.date.getTime()).toBe(86_400_000);
    // Mid-September at 60°N: sunrise time of day moves ~2.3 min later per day
    const shift =
      tomorrow.sunrise!.getTime() -
      tomorrow.date.getTime() -
      (today.sunrise!.getTime() - today.date.getTime());
    expect(shift).toBeGreaterThan(2 * 60_000);
    expect(shift).toBeLessThan(5 * 60_000);
  });

  it("keeps day length near 12 hours on the equinox at Oslo", () => {
    const { today } = daylightTimes(
      OSLO.latitude,
      OSLO.longitude,
      new Date("2026-03-20T00:00:00Z"),
    );
    expectNearMinutes(today.sunrise, "2026-03-20T05:16:02Z");
    expectNearMinutes(today.sunset, "2026-03-20T17:32:52Z");
    expect(today.dayLengthMinutes).toBeGreaterThan(725);
    expect(today.dayLengthMinutes).toBeLessThan(745);
  });

  it("nulls every event at Kiruna on the summer solstice (midnight sun)", () => {
    const { today } = daylightTimes(
      67.8558,
      20.2253,
      new Date("2026-06-21T00:00:00Z"),
    );
    expect(today.solarNoon).not.toBeNull();
    for (const key of [
      "sunrise",
      "sunset",
      "civilDawn",
      "civilDusk",
      "nauticalDawn",
      "nauticalDusk",
      "astronomicalDawn",
      "astronomicalDusk",
      "darkWindowStart",
      "darkWindowEnd",
    ] as const) {
      expect(today[key]).toBeNull();
    }
    expect(today.dayLengthMinutes).toBeNull();
    expect(today.polar).toBe("midnight-sun");
  });

  it("keeps twilight but nulls sunrise and sunset at Kiruna on the winter solstice (polar night)", () => {
    const { today } = daylightTimes(
      67.8558,
      20.2253,
      new Date("2026-12-21T00:00:00Z"),
    );
    expect(today.sunrise).toBeNull();
    expect(today.sunset).toBeNull();
    expect(today.dayLengthMinutes).toBeNull();
    expect(today.polar).toBe("polar-night");
    // Civil, nautical and astronomical twilight still happen at 67.85°N
    expectNearMinutes(today.civilDawn, "2026-12-21T07:56:01Z");
    expectNearMinutes(today.civilDusk, "2026-12-21T13:18:15Z");
    expectNearMinutes(today.nauticalDawn, "2026-12-21T06:27:42Z");
    expectNearMinutes(today.nauticalDusk, "2026-12-21T14:46:33Z");
    expectNearMinutes(today.astronomicalDawn, "2026-12-21T05:16:40Z");
    expectNearMinutes(today.astronomicalDusk, "2026-12-21T15:57:36Z");
  });
});