import { describe, expect, it } from "vitest";

import {
  bzIntervalText,
  kpIntervalText,
  speedIntervalText,
} from "./interval-texts";

/**
 * The summary's condensed single-sentence contract (human decision
 * 2026-09-12: one merged paragraph inside the Aurora Now panel, no P1/P2
 * variants, no per-row cards, no caveat/sources lines, no hemispheric
 * power). Each level keeps a stable sentence key pinned here so a NOAA
 * rewording fails loudly via the key, and every sentence carries
 * likelihood language ("possible / can / favors / may", never "will"
 * or "tonight" - a 3-hour Kp block cannot ground a tonight claim).
 */
describe("kpIntervalText - live Kp index", () => {
  it("reads calm for Kp below 3", () => {
    expect(kpIntervalText(0).level).toBe("calm");
    expect(kpIntervalText(2.67).level).toBe("calm");
  });

  it("reads active for Kp 3 up to but not including 6", () => {
    expect(kpIntervalText(3).level).toBe("active");
    expect(kpIntervalText(5.33).level).toBe("active");
    expect(kpIntervalText(5.99).level).toBe("active");
  });

  it("reads storm-like for Kp 6 and above, pinned at the boundary", () => {
    expect(kpIntervalText(6).level).toBe("storm-like");
    expect(kpIntervalText(7.33).level).toBe("storm-like");
    expect(kpIntervalText(9).level).toBe("storm-like");
    expect(kpIntervalText(9.9).level).toBe("storm-like");
  });

  it("says no data for a missing Kp reading, never a level and never zero", () => {
    expect(kpIntervalText(null).level).toBe("no-data");
    expect(kpIntervalText(null).sentence).toMatch(/no data/i);
  });

  it("keys every row by level", () => {
    expect(kpIntervalText(1).key).toBe("kp-calm");
    expect(kpIntervalText(4).key).toBe("kp-active");
    expect(kpIntervalText(7.33).key).toBe("kp-storm");
    expect(kpIntervalText(null).key).toBe("no-data");
  });

  it("stays short and carries likelihood, never a tonight claim (N5)", () => {
    for (const kp of [1, 4, 7.33]) {
      const row = kpIntervalText(kp);
      expect(row.sentence.length).toBeLessThan(220);
      expect(row.sentence).toMatch(/possible|can|may|should/i);
      expect(row.sentence).not.toMatch(/tonight/i);
      expect(row.source).toMatch(/Tips on Viewing the Aurora/);
    }
  });

  it("tells far-south viewers to expect red in the storm-like line without promising a color", () => {
    expect(kpIntervalText(7.33).sentence).toMatch(/red/i);
  });

  it("never conflates planetary Kp with the local oval glow (N9)", () => {
    for (const kp of [1, 4, 7.33]) {
      expect(kpIntervalText(kp).sentence).not.toMatch(/oval|cell/i);
    }
  });
});

describe("speedIntervalText - solar wind speed (L1 readings)", () => {
  it("reads calm below 400 km/s, pinned at the boundary", () => {
    expect(speedIntervalText(300).level).toBe("calm");
    expect(speedIntervalText(399.9).level).toBe("calm");
  });

  it("reads active from 400 up to but not including 700", () => {
    expect(speedIntervalText(400).level).toBe("active");
    expect(speedIntervalText(699).level).toBe("active");
  });

  it("reads storm-like at 700 and above", () => {
    expect(speedIntervalText(700).level).toBe("storm-like");
    expect(speedIntervalText(800).level).toBe("storm-like");
  });

  it("says no data for a missing reading, never a level and never zero", () => {
    expect(speedIntervalText(null).level).toBe("no-data");
  });

  it("pairs the direction caveat with every line (speed alone never decides, N2)", () => {
    for (const speed of [300, 550, 750]) {
      const row = speedIntervalText(speed);
      expect(row.sentence).toMatch(/direction|gate|southward/i);
      expect(row.source).toMatch(/Solar Wind/i);
    }
  });
});

describe("bzIntervalText - Bz (GSM) as the gate", () => {
  it("reads calm for northward Bz above zero", () => {
    expect(bzIntervalText(5).level).toBe("calm");
    expect(bzIntervalText(0.1).level).toBe("calm");
  });

  it("reads active from zero down to but not including -10", () => {
    expect(bzIntervalText(0).level).toBe("active");
    expect(bzIntervalText(-1.96).level).toBe("active");
    expect(bzIntervalText(-9.9).level).toBe("active");
  });

  it("reads storm-like at -10 and below, with sustained-hours framing", () => {
    expect(bzIntervalText(-10).level).toBe("storm-like");
    expect(bzIntervalText(-15).level).toBe("storm-like");
    expect(bzIntervalText(-25).level).toBe("storm-like");
  });

  it("says no data for a missing reading, never a level and never zero", () => {
    expect(bzIntervalText(null).level).toBe("no-data");
  });

  it("speaks gate language only - favors/can drive, never a Kp outcome (N1)", () => {
    for (const bz of [5, -2, -15]) {
      const row = bzIntervalText(bz);
      expect(row.sentence).toMatch(/gate/i);
      expect(row.sentence).not.toMatch(/kp\s*\d/i);
    }
  });

  it("keeps the sustained-hours framing in the southward lines", () => {
    expect(bzIntervalText(-2).sentence).toMatch(/hours/i);
    expect(bzIntervalText(-15).sentence).toMatch(/hours/i);
    expect(bzIntervalText(-15).source).toMatch(/Geomagnetic Storms/i);
  });

  it("never uses the word conditions for a 1-min reading (N12)", () => {
    for (const bz of [5, -2, -15]) {
      expect(bzIntervalText(bz).sentence).not.toMatch(/conditions/i);
    }
  });
});
