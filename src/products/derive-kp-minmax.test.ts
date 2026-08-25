import { describe, expect, it } from "vitest";
import { deriveMinMaxKp } from "./derive-kp-minmax";
import type { KpBreakdownRow } from "./3-day-forecast";
import { parseThreeDayForecast } from "./3-day-forecast";
import fixture from "./fixtures/3-day-forecast.txt?raw";

describe("deriveMinMaxKp", () => {
  it("derives min and max per day from fixture breakdown", () => {
    const forecast = parseThreeDayForecast(fixture);
    const result = deriveMinMaxKp(forecast.days, forecast.geomagneticActivity.kpBreakdown);
    expect(result).toHaveLength(3);
    // From fixture: Aug 23 values [0.67,2,1.67,2,1.33,1.33,1.67,1.67] min 0.67 max 2
    expect(result[0].day).toBe("Aug 23");
    expect(result[0].min).toBeCloseTo(0.67);
    expect(result[0].max).toBeCloseTo(2);
    expect(result[0].gLabel).toBe(null);
    // Day 2 Aug 24 values [1.67,1.67,1.67,1.33,0.67,1.33,1.67,1.67] min 0.67 max 1.67
    expect(result[1].min).toBeCloseTo(0.67);
    expect(result[1].max).toBeCloseTo(1.67);
  });

  it("adds G badge when max >=5", () => {
    const breakdown: KpBreakdownRow[] = [
      { timeSlot: "00-03UT", days: [5, 2, 6] },
      { timeSlot: "03-06UT", days: [4, 3, 9] },
    ];
    const result = deriveMinMaxKp(["Aug 23", "Aug 24", "Aug 25"], breakdown);
    expect(result[0].gLabel).toBe("G1"); // max 5 => G1 (5-4)
    expect(result[1].gLabel).toBe(null); // max 3
    expect(result[2].gLabel).toBe("G5"); // max 9 => G5
  });

  it("handles single row edge", () => {
    const breakdown: KpBreakdownRow[] = [{ timeSlot: "00-03UT", days: [2, 3, 4] }];
    const result = deriveMinMaxKp(["Aug 23", "Aug 24", "Aug 25"], breakdown);
    expect(result[0].min).toBe(2);
    expect(result[0].max).toBe(2);
  });
});
