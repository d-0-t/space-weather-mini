import { describe, expect, it } from "vitest";

import fixture from "./fixtures/alerts.json?raw";
import emptyFixture from "./fixtures/alerts-empty.json?raw";
import {
  alertKey,
  alertMatchesThreshold,
  alertSnippet,
  alertTitle,
  forecastBreachInNext24h,
  loadSeenAlertKeys,
  matchingAlerts,
  newestAlertTime,
  parseAlerts,
  saveSeenAlertKeys,
} from "./alerts";
import type { PlanetaryKForecastPoint } from "./noaa-planetary-k-index";

describe("parseAlerts (ticket 02)", () => {
  it("parses the live SWPC fixture into typed alerts", () => {
    const alerts = parseAlerts(fixture);
    expect(alerts.length).toBeGreaterThan(80);
    const first = alerts[0];
    expect(first.product_id).toMatch(/^[A-Z0-9]{4}$/);
    expect(first.issue_datetime).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
    expect(first.message).toContain("Space Weather Message Code:");
    expect(first.code).toMatch(/^[A-Z]{3}[A-Z0-9]{3}$/);
  });

  it("derives code, kind, kp and G scale from the message header", () => {
    const alerts = parseAlerts(fixture);
    const k5Warning = alerts.find((a) => a.code === "WARK05");
    expect(k5Warning).toBeDefined();
    expect(k5Warning!.kind).toBe("WARNING");
    expect(k5Warning!.kp).toBe(5);
    expect(k5Warning!.gScale).toBe(1);
    expect(k5Warning!.message).toContain("Noaa Scale: G1 - Minor");

    const k4Alert = alerts.find((a) => a.code === "ALTK04");
    expect(k4Alert!.kind).toBe("ALERT");
    expect(k4Alert!.kp).toBe(4);
    expect(k4Alert!.gScale).toBeNull();
  });

  it("parses the A-index watch as a WATCH with the G category from the message", () => {
    const alerts = parseAlerts(fixture);
    const a30Watch = alerts.find((a) => a.code === "WATA30");
    expect(a30Watch!.kind).toBe("WATCH");
    expect(a30Watch!.kp).toBeNull();
    expect(a30Watch!.gScale).toBe(2);
    expect(a30Watch!.message).toContain("Category G2 Predicted");
  });

  it("leaves non-geomagnetic alerts without kp or G scale", () => {
    const alerts = parseAlerts(fixture);
    const radioAlert = alerts.find((a) => a.code === "ALTTP2");
    expect(radioAlert!.kp).toBeNull();
    expect(radioAlert!.gScale).toBeNull();
    const protonSummary = alerts.find((a) => a.code === "SUMPX1");
    expect(protonSummary!.kind).toBe("SUMMARY");
  });

  it("parses an empty feed to an empty list", () => {
    expect(parseAlerts(emptyFixture)).toEqual([]);
  });

  it("throws a format-changed error on invalid JSON", () => {
    expect(() => parseAlerts("not json")).toThrow(/NOAA format may have changed/);
  });

  it("throws a format-changed error when an item lacks the required fields", () => {
    expect(() => parseAlerts('[{"product_id":"K04W"}]')).toThrow(
      /NOAA format may have changed/,
    );
  });
});

describe("alertMatchesThreshold (ticket 02)", () => {
  it("matches a K-index warning at or above the threshold", () => {
    const alerts = parseAlerts(fixture);
    const k5 = alerts.find((a) => a.code === "WARK05")!;
    const k4 = alerts.find((a) => a.code === "WARK04")!;
    expect(alertMatchesThreshold(k5, 5)).toBe(true);
    expect(alertMatchesThreshold(k5, 6)).toBe(false);
    expect(alertMatchesThreshold(k4, 5)).toBe(false);
  });

  it("matches an A-index watch via the G category in its message", () => {
    const alerts = parseAlerts(fixture);
    const watch = alerts.find((a) => a.code === "WATA30")!;
    expect(alertMatchesThreshold(watch, 5)).toBe(true); // G2 watch, G1 threshold
    expect(alertMatchesThreshold(watch, 6)).toBe(true); // G2 watch, G2 threshold
    expect(alertMatchesThreshold(watch, 7)).toBe(false); // G2 watch, G3 threshold
  });

  it("never matches summaries or non-geomagnetic alerts", () => {
    const alerts = parseAlerts(fixture);
    const radio = alerts.find((a) => a.code === "ALTTP2")!;
    const summary = alerts.find((a) => a.code === "SUMXM5")!;
    expect(alertMatchesThreshold(radio, 1)).toBe(false);
    expect(alertMatchesThreshold(summary, 1)).toBe(false);
  });

  it("filters and sorts matching alerts newest first, deduped by key", () => {
    const alerts = parseAlerts(fixture);
    const matches = matchingAlerts(alerts, 5);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((a) => alertMatchesThreshold(a, 5))).toBe(true);
    const times = matches.map((a) => a.issue_datetime);
    expect([...times].sort().reverse()).toEqual(times);
    expect(new Set(matches.map(alertKey)).size).toBe(matches.length);
  });
});

describe("alert helpers (ticket 02)", () => {
  it("builds the dedup key from product_id and issue_datetime", () => {
    expect(
      alertKey({
        product_id: "K05W",
        issue_datetime: "2026-08-28 13:00:00.000",
        message: "",
        code: "WARK05",
        kind: "WARNING",
        kp: 5,
        gScale: 1,
      }),
    ).toBe("K05W|2026-08-28 13:00:00.000");
  });

  it("extracts the actionable line as the snippet", () => {
    const alerts = parseAlerts(fixture);
    const k5 = alerts.find((a) => a.code === "WARK05")!;
    expect(alertSnippet(k5)).toBe("WARNING: Geomagnetic K-index of 5 expected");
    const watch = alerts.find((a) => a.code === "WATA30")!;
    expect(alertSnippet(watch)).toBe(
      "WATCH: Geomagnetic Storm Category G2 Predicted",
    );
  });

  it("builds a human title for notifications", () => {
    const alerts = parseAlerts(fixture);
    const k5 = alerts.find((a) => a.code === "WARK05")!;
    expect(alertTitle(k5)).toBe("Geomagnetic K-index of 5 expected");
    const k4 = alerts.find((a) => a.code === "ALTK04")!;
    expect(alertTitle(k4)).toBe("Geomagnetic K-index of 4");
  });

  it("finds the newest alert issue time for the stale-cache age", () => {
    const alerts = parseAlerts(fixture);
    expect(newestAlertTime(alerts)).toMatch(/^2026-08-28 1[45]:/);
    expect(newestAlertTime([])).toBeNull();
  });

  it("finds the strongest Kp forecast breach inside the next 24 hours", () => {
    const now = Date.UTC(2026, 7, 28, 12, 0, 0);
    const points: PlanetaryKForecastPoint[] = [
      { time_tag: "2026-08-28T15:00:00", kp: 5, observed: "predicted", noaa_scale: null },
      { time_tag: "2026-08-29T06:00:00", kp: 6, observed: "predicted", noaa_scale: null },
      { time_tag: "2026-08-30T00:00:00", kp: 7, observed: "predicted", noaa_scale: null },
    ];
    const breach = forecastBreachInNext24h(points, 5, now);
    expect(breach).toEqual({ time_tag: "2026-08-29T06:00:00", kp: 6 });
    expect(forecastBreachInNext24h(points, 7, now)).toBeNull();
    expect(
      forecastBreachInNext24h(points, 5, now + 37 * 60 * 60 * 1000),
    ).toBeNull();
  });

  it("round-trips the seen-alert keys through storage with a 200 cap", () => {
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
    };
    expect(loadSeenAlertKeys(fakeStorage)).toEqual([]);
    const many = Array.from({ length: 220 }, (_, i) => `key-${i}`);
    saveSeenAlertKeys(fakeStorage, many);
    const loaded = loadSeenAlertKeys(fakeStorage);
    expect(loaded.length).toBe(200);
    expect(loaded[0]).toBe("key-20");
    expect(loaded[199]).toBe("key-219");
  });
});