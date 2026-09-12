// moonTimes derives its day windows from the device-local calendar day of the
// passed instant; pinning UTC keeps the pinned literals deterministic on any
// host (the straddling local-midnight windows are driven directly through
// moonDayTimes with explicit UTC instants).
process.env.TZ = "UTC";

import { describe, expect, it } from "vitest";

import {
  isMoonAboveHorizon,
  moonAltitudeDegrees,
  moonDayTimes,
  moonTimes,
} from "./moon";

/**
 * Expected values are pinned to the time.now moonrise/moonset calendars for
 * Oslo and Tromsø, September 2026 (fetched live on 2026-09-12 and recorded in
 * docs/research/plain-language-moon-2026-09-12.md). All calendar times are
 * CEST (UTC+2). Independent models disagree on rise/set instants by up to
 * ~5 min on ordinary days (more on grazing days, which get loose bounds), so
 * each event is asserted inside a 6 minute window around the independent
 * literal; meridian-passage altitudes are asserted within 0.5°.
 */
const expectNearMinutes = (
  actual: Date | null,
  isoExpected: string,
  toleranceMinutes = 6,
): void => {
  expect(actual).not.toBeNull();
  const delta = Math.abs((actual as Date).getTime() - Date.parse(isoExpected));
  expect(delta).toBeLessThanOrEqual(toleranceMinutes * 60_000);
};

const expectNearDegrees = (
  actual: number,
  expected: number,
  toleranceDegrees = 0.5,
): void => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(toleranceDegrees);
};

const OSLO = { latitude: 59.91, longitude: 10.75 };
const TROMSO = { latitude: 69.65, longitude: 18.96 };

describe("moonAltitudeDegrees (suncalc getMoonPosition)", () => {
  it("matches the Oslo meridian-passage altitude of +7.6° on 2026-09-15", () => {
    expectNearDegrees(
      moonAltitudeDegrees(OSLO.latitude, OSLO.longitude, new Date("2026-09-15T14:29:00Z")),
      7.6,
    );
  });

  it("matches the Tromsø meridian-passage altitude of −5.3° on 2026-09-16 (moon below all day)", () => {
    expectNearDegrees(
      moonAltitudeDegrees(TROMSO.latitude, TROMSO.longitude, new Date("2026-09-16T14:44:00Z")),
      -5.3,
    );
  });

  it("matches the Tromsø meridian-passage altitude of +42.4° on 2026-09-30 (moon up all day)", () => {
    expectNearDegrees(
      moonAltitudeDegrees(TROMSO.latitude, TROMSO.longitude, new Date("2026-09-30T01:14:00Z")),
      42.4,
    );
  });
});

describe("isMoonAboveHorizon – instant gate for the sky line", () => {
  it("flips across Oslo's 2026-09-15 moonrise (~11:14Z) and moonset (~17:31Z)", () => {
    expect(isMoonAboveHorizon(OSLO.latitude, OSLO.longitude, new Date("2026-09-15T10:00:00Z"))).toBe(
      false,
    );
    expect(isMoonAboveHorizon(OSLO.latitude, OSLO.longitude, new Date("2026-09-15T14:00:00Z"))).toBe(
      true,
    );
    expect(isMoonAboveHorizon(OSLO.latitude, OSLO.longitude, new Date("2026-09-15T18:00:00Z"))).toBe(
      false,
    );
  });
});

describe("moonTimes (suncalc) for the interpreter sky line", () => {
  it("pins Oslo's rise and set for 2026-09-15 and 2026-09-16 against calendar literals", () => {
    const { today, tomorrow } = moonTimes(
      OSLO.latitude,
      OSLO.longitude,
      new Date("2026-09-15T12:00:00Z"),
    );
    expectNearMinutes(today.rise, "2026-09-15T11:14:00Z");
    expectNearMinutes(today.set, "2026-09-15T17:31:00Z");
    expectNearMinutes(tomorrow.rise, "2026-09-16T12:50:00Z");
    expectNearMinutes(tomorrow.set, "2026-09-16T17:37:00Z");
    expect(today.alwaysUp).toBe(false);
    expect(today.alwaysDown).toBe(false);
    expect(tomorrow.alwaysUp).toBe(false);
    expect(tomorrow.alwaysDown).toBe(false);
  });

  it("keys today and tomorrow to the device-local calendar day of the injected instant", () => {
    const { today, tomorrow } = moonTimes(
      OSLO.latitude,
      OSLO.longitude,
      new Date("2026-09-15T12:00:00Z"),
    );
    expect(today.date.getTime()).toBe(Date.parse("2026-09-15T00:00:00Z"));
    expect(tomorrow.date.getTime()).toBe(Date.parse("2026-09-16T00:00:00Z"));
    expect(tomorrow.date.getTime() - today.date.getTime()).toBe(86_400_000);
  });

  it("reports the moon never rising at Tromsø on 2026-09-16 (polar edge, verified by altitude)", () => {
    const { today } = moonTimes(
      TROMSO.latitude,
      TROMSO.longitude,
      new Date("2026-09-16T12:00:00Z"),
    );
    expect(today.rise).toBeNull();
    expect(today.set).toBeNull();
    expect(today.alwaysDown).toBe(true);
    expect(today.alwaysUp).toBe(false);
    // The flag agrees with the independent gate at the meridian passage:
    // the moon's highest point that day is −5.3°, below the horizon.
    expect(
      isMoonAboveHorizon(TROMSO.latitude, TROMSO.longitude, new Date("2026-09-16T14:44:00Z")),
    ).toBe(false);
  });

  it("reports the moon never setting at Tromsø on 2026-09-30 (polar edge, verified by altitude)", () => {
    const { today } = moonTimes(
      TROMSO.latitude,
      TROMSO.longitude,
      new Date("2026-09-30T12:00:00Z"),
    );
    expect(today.rise).toBeNull();
    expect(today.set).toBeNull();
    expect(today.alwaysUp).toBe(true);
    expect(today.alwaysDown).toBe(false);
    // Meridian passage +42.4° per the calendar; the gate must agree.
    expect(
      isMoonAboveHorizon(TROMSO.latitude, TROMSO.longitude, new Date("2026-09-30T01:14:00Z")),
    ).toBe(true);
  });

  it("keeps the days before the never-rising stretch in ordinary rise/set shape", () => {
    // 2026-09-11: rise 06:13 CEST = 04:13Z, set 18:52 CEST = 16:52Z (Tromsø).
    const { today, tomorrow } = moonTimes(
      TROMSO.latitude,
      TROMSO.longitude,
      new Date("2026-09-11T12:00:00Z"),
    );
    expectNearMinutes(today.rise, "2026-09-11T04:13:00Z");
    expectNearMinutes(today.set, "2026-09-11T16:52:00Z");
    // 2026-09-12: rise 08:16 CEST = 06:16Z, set 18:27 CEST = 16:27Z.
    expectNearMinutes(tomorrow.rise, "2026-09-12T06:16:00Z");
    expectNearMinutes(tomorrow.set, "2026-09-12T16:27:00Z");
  });

  it("resumes rise/set events after the never-rising stretch (2026-09-22 transition)", () => {
    // Grazing rise: independent sources disagree by ~8 min on this day, so
    // assert the structure and the late-evening window loosely.
    const { today } = moonTimes(
      TROMSO.latitude,
      TROMSO.longitude,
      new Date("2026-09-22T12:00:00Z"),
    );
    expect(today.rise).not.toBeNull();
    expect(today.set).not.toBeNull();
    const riseHour = today.rise!.getTime() - today.date.getTime();
    expect(riseHour).toBeGreaterThan(17.5 * 3_600_000);
    expect(riseHour).toBeLessThan(18.5 * 3_600_000);
  });
});

describe("moonDayTimes – explicit window for local midnights away from UTC", () => {
  it("stitches the two UTC-day scans Oslo's 2026-09-15 local midnight straddles", () => {
    // Oslo local midnight = 2026-09-14T22:00Z; the window covers UTC days
    // 14 and 15, and must keep only the events inside the window (the
    // Sep-14 UTC-day scan's rise 09:36Z / set 17:32Z are before it).
    const day = moonDayTimes(OSLO.latitude, OSLO.longitude, new Date("2026-09-14T22:00:00Z"));
    expectNearMinutes(day.rise, "2026-09-15T11:14:00Z");
    expectNearMinutes(day.set, "2026-09-15T17:31:00Z");
    expect(day.alwaysUp).toBe(false);
    expect(day.alwaysDown).toBe(false);
  });

  it("reads the always-up state from the gate when no crossing falls in the window", () => {
    // Tromsø local midnight of 2026-09-30 = 2026-09-29T22:00Z; no rise or
    // set occurs inside the window (the moon is up the whole local day).
    const day = moonDayTimes(TROMSO.latitude, TROMSO.longitude, new Date("2026-09-29T22:00:00Z"));
    expect(day.rise).toBeNull();
    expect(day.set).toBeNull();
    expect(day.alwaysUp).toBe(true);
    expect(day.alwaysDown).toBe(false);
  });
});
