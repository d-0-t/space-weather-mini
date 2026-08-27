import { describe, expect, it } from "vitest";

import {
  addMinutes,
  formatLocalTime,
  formatTooltipTime,
  smoothPoints,
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