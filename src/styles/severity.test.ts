import { describe, expect, it } from "vitest";
import { severityColor } from "./severity";

describe("severityColor", () => {
  it("maps speed to the gray→magenta ramp", () => {
    expect(severityColor("speed", 150)).toBe("#9aa0a6"); // gray < 200
    expect(severityColor("speed", 200)).toBe("#4ade80"); // green 200–300
    expect(severityColor("speed", 450)).toBe("#f44336"); // red 400–600
    expect(severityColor("speed", 700)).toBe("#ff00ea"); // magenta 600+
    expect(severityColor("speed", 900)).toBe("#ff00ea"); // magenta 600+
  });

  it("maps density with the orange 20–40 band", () => {
    expect(severityColor("density", 0.5)).toBe("#9aa0a6");
    expect(severityColor("density", 1)).toBe("#4ade80");
    expect(severityColor("density", 12)).toBe("#facc15");
    expect(severityColor("density", 25)).toBe("#fb923c");
    expect(severityColor("density", 45)).toBe("#f44336");
    expect(severityColor("density", 70)).toBe("#ff00ea");
  });

  it("maps Bt quiet→elevated→strong→very strong", () => {
    expect(severityColor("bt", 3)).toBe("#4ade80");
    expect(severityColor("bt", 10)).toBe("#facc15");
    expect(severityColor("bt", 20)).toBe("#f44336");
    expect(severityColor("bt", 40)).toBe("#ff00ea");
  });

  it("maps Bz with southward (negative) as the disturbance direction", () => {
    expect(severityColor("bz", 5)).toBe("#4ade80");
    expect(severityColor("bz", 0)).toBe("#4ade80");
    expect(severityColor("bz", -3)).toBe("#facc15");
    expect(severityColor("bz", -8)).toBe("#f44336");
    expect(severityColor("bz", -15)).toBe("#ff00ea");
  });

  it("maps hemispheric power quiet→active→strong→very strong", () => {
    expect(severityColor("hemi", 5)).toBe("#4ade80");
    expect(severityColor("hemi", 20)).toBe("#facc15");
    expect(severityColor("hemi", 40)).toBe("#f44336");
    expect(severityColor("hemi", 60)).toBe("#ff00ea");
  });

  it("maps Dst with deeper negative as worse", () => {
    expect(severityColor("dst", -10)).toBe("#4ade80");
    expect(severityColor("dst", -40)).toBe("#facc15");
    expect(severityColor("dst", -75)).toBe("#f44336");
    expect(severityColor("dst", -150)).toBe("#ff00ea");
  });

  it("maps Boulder K quiet→unsettled→active→storm", () => {
    expect(severityColor("boulder", 2)).toBe("#4ade80");
    expect(severityColor("boulder", 3)).toBe("#facc15");
    expect(severityColor("boulder", 4)).toBe("#f44336");
    expect(severityColor("boulder", 6)).toBe("#ff00ea");
  });
});