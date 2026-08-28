import { describe, expect, it } from "vitest";

import {
  addMinutes,
  dedupeTooltipEntries,
  formatLocalTime,
  formatTooltipTime,
  smoothPoints,
  splitSeriesByColor,
  symmetricCeiling,
  transitMinutes,
  withNowAnchor,
} from "./live-panels";

describe("live-panels chart helpers", () => {
  it("computes L1 transit time, readable tooltip timestamps and local time", () => {
    expect(transitMinutes(400)).toBe(63); // 1.5e6 km / 400 km/s ≈ 62.5 min
    expect(transitMinutes(750)).toBe(33);
    expect(transitMinutes(null)).toBe(0);
    expect(addMinutes("2026-08-26T22:00:00", 60)).toBe("2026-08-26T23:00");
    expect(formatTooltipTime("2026-08-26T22:04:07")).toBe("26 Aug 2026 22:04");
    expect(formatTooltipTime("2026-08-26_21:00")).toBe("26 Aug 2026 21:00");
    expect(formatLocalTime("2026-08-26T22:04:07")).toMatch(
      /^\d{1,2}:\d{2}( AM| PM)?$/,
    );
    expect(formatLocalTime("2026-08-26_21:00")).toMatch(
      /^\d{1,2}:\d{2}( AM| PM)?$/,
    );
  });

  it("averages rows into time buckets for a cleaner line", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      time_tag: new Date(Date.UTC(2026, 7, 26, 22, i)).toISOString(),
      value: i + 1, // 1..10
    }));
    // 5-minute buckets: mean(1..5) = 3, mean(6..10) = 8
    const points = smoothPoints(rows, 60, 5);
    expect(points).toHaveLength(2);
    expect(points[0].value).toBeCloseTo(3);
    expect(points[1].value).toBeCloseTo(8);
    expect(points[1].time).toBe("22:05");
    // Null rows leave gaps instead of poisoning the average
    const sparse = [
      { time_tag: "2026-08-26T22:00:00", value: 1 },
      { time_tag: "2026-08-26T22:01:00", value: null },
      { time_tag: "2026-08-26T22:02:00", value: 3 },
    ];
    expect(smoothPoints(sparse, 10, 5)[0].value).toBeCloseTo(2);
    // A null window plots every row, even ones a window would cut off
    const full = smoothPoints(
      [
        { time_tag: "2026-08-26T20:00:00", value: 1 },
        { time_tag: "2026-08-26T22:00:00", value: 9 },
      ],
      null,
      60,
    );
    expect(full).toHaveLength(2);
  });

  it("places the Now anchor transit points LEFT of the freshest reading", () => {
    const points = [
      { x: 179, time: "22:00", timeTag: "2026-08-26T22:00:00", value: 1 },
    ];
    const anchored = withNowAnchor(points, "20:32", 88);
    expect(anchored).toHaveLength(2);
    expect(anchored[1]).toEqual({
      x: 91,
      time: "20:32",
      timeTag: "",
      value: null,
    });
    // No anchor when the label exists in the data (1-min feeds cover it)
    expect(withNowAnchor(points, "22:00", 88)).toHaveLength(1);
  });

  it("rounds the mirrored chart ceiling up symmetrically", () => {
    expect(symmetricCeiling([18, 16])).toBe(20);
    expect(symmetricCeiling([0])).toBe(10);
    expect(symmetricCeiling([53])).toBe(55);
    expect(symmetricCeiling([-12, 0])).toBe(15);
  });
});

describe("splitSeriesByColor", () => {
  const pts = (values: (number | null)[]) =>
    values.map((value, x) => ({
      x,
      time: `${x}:00`,
      timeTag: `2026-08-26T0${x}:00:00`,
      value,
    }));

  it("emits one series per same-color run, bridged one point into the next", () => {
    const segments = splitSeriesByColor(
      pts([100, 300, 500, 700, 900]),
      (p) => p.value,
      (p) => p.value,
      (v) => (v < 200 ? "#gray" : v < 600 ? "#green" : "#red"),
    );
    expect(segments.map((s) => s.color)).toEqual(["#gray", "#green", "#red"]);
    // Each run reaches one point into the next so the line stays continuous;
    // the bridge point is shared only as a vertex, never as a segment.
    expect(segments[0].points.map((p) => p.value)).toEqual([
      100, 300, null, null, null,
    ]);
    expect(segments[1].points.map((p) => p.value)).toEqual([
      null, 300, 500, 700, null,
    ]);
    expect(segments[2].points.map((p) => p.value)).toEqual([
      null, null, null, 700, 900,
    ]);
  });

  it("never overlaps segments when the line dips in and out of a band", () => {
    // Yellow-red-yellow: the isolated red point must not be crossed by a
    // yellow line. Each point is plotted by at most two series (its own run
    // plus the previous run's bridge point) and never as a shared segment.
    const segments = splitSeriesByColor(
      pts([450, 470, 610, 480]),
      (p) => p.value,
      (p) => p.value,
      (v) => (v < 600 ? "#yellow" : "#red"),
    );
    expect(segments.map((s) => s.color)).toEqual([
      "#yellow",
      "#red",
      "#yellow",
    ]);
    expect(segments[0].points.map((p) => p.value)).toEqual([
      450, 470, 610, null,
    ]);
    expect(segments[1].points.map((p) => p.value)).toEqual([
      null, null, 610, 480,
    ]);
    expect(segments[2].points.map((p) => p.value)).toEqual([
      null, null, null, 480,
    ]);
    // Segments are single-owned: no index has two non-null neighbours in
    // different series (a shared vertex is fine, a shared segment is not).
    for (let i = 0; i < 3; i++) {
      const present = segments.filter(
        (s) => s.points[i]?.value !== null && s.points[i + 1]?.value !== null,
      );
      expect(present.length).toBeLessThanOrEqual(1);
    }
  });

  it("keeps null points (gaps, Now anchor) out of every segment", () => {
    const segments = splitSeriesByColor(
      pts([300, null, 500]),
      (p) => p.value,
      (p) => p.value,
      (v) => (v < 400 ? "#green" : "#yellow"),
    );
    expect(segments.map((s) => s.color)).toEqual(["#green", "#yellow"]);
    expect(segments[0].points.map((p) => p.value)).toEqual([300, null, null]);
    expect(segments[1].points.map((p) => p.value)).toEqual([null, null, 500]);
  });

  it("colors by the band value while plotting the display value", () => {
    // Mirrored second series: band on the raw positive GW, plot its negation
    // under dataKey "value2" – and never leak a value into "value".
    const segments = splitSeriesByColor(
      pts([20, 5]),
      (p) => p.value,
      (p) => (p.value === null ? null : -(p.value as number)),
      (v) => (v < 10 ? "#green" : "#yellow"),
      "value2",
    );
    const values = (points: { value: number | null }[]) =>
      points.map((p) => (p as { value2?: number | null }).value2 ?? null);
    expect(values(segments[0].points)).toEqual([-20, -5]);
    expect(segments[0].points.map((p) => p.value)).toEqual([null, null]);
    expect(values(segments[1].points)).toEqual([null, -5]);
  });

  it("nulls the secondary key on the primary series", () => {
    const segments = splitSeriesByColor(
      pts([20, 5]),
      (p) => p.value,
      (p) => p.value,
      (v) => (v < 10 ? "#green" : "#yellow"),
    );
    const secondary = (points: { value: number | null }[]) =>
      points.map((p) => (p as { value2?: number | null }).value2 ?? null);
    expect(secondary(segments[0].points)).toEqual([null, null]);
    expect(secondary(segments[1].points)).toEqual([null, null]);
  });
});

describe("dedupeTooltipEntries", () => {
  it("collapses duplicate bridge-point entries, keeping the newest band", () => {
    expect(
      dedupeTooltipEntries([
        { name: "North hemispheric power", value: 20, color: "#yellow" },
        { name: "South hemispheric power", value: 35, color: "#yellow" },
        { name: "South hemispheric power", value: 35, color: "#red" },
      ]),
    ).toEqual([
      { name: "North hemispheric power", value: 20, color: "#yellow" },
      { name: "South hemispheric power", value: 35, color: "#red" },
    ]);
  });
});