import { describe, expect, it } from "vitest";

import {
  kpIntervalText,
  l1IntervalText,
  l1Word,
  overallWord,
} from "./interval-texts";

/**
 * The summary's condensed single-sentence contract (human decisions
 * 2026-09-12 and 2026-09-13: one merged paragraph inside the Aurora Now
 * panel, no P1/P2 variants, no per-row cards, no caveat/sources lines, no
 * hemispheric power, and speed + magnetic field merged into ONE L1
 * sentence). Each level keeps a stable sentence key pinned here so a NOAA
 * rewording fails loudly via the key, and every sentence carries
 * likelihood language ("possible / can / may", never "will"
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

describe("l1IntervalText - merged solar-wind + magnetic-field sentence", () => {
  it("speed bands pin at the boundaries: calm < 400, active at 400, storm-grade at 700", () => {
    // Slow + wrong-way field: calm. 399.9 vs 400 is the speed boundary.
    expect(l1IntervalText(399.9, 5, 5).level).toBe("calm");
    expect(l1IntervalText(400, 5, 5).level).toBe("active");
    // Very fast + strongly-right field: storm. 699.9 vs 700 is the
    // boundary only where the field lets the speed decide.
    expect(l1IntervalText(699.9, -15, 5).level).toBe("storm-like");
    expect(l1IntervalText(700, -15, 5).level).toBe("storm-like");
  });

  it("reads calm only when the stream is slow AND the field points the wrong way", () => {
    expect(l1IntervalText(300, 5, 5).level).toBe("calm");
    expect(l1IntervalText(0, 5, 5).level).toBe("calm");
  });

  it("caps the level at active whenever the field points the wrong way, however fast the stream (N2)", () => {
    expect(l1IntervalText(750, 5, 5).level).toBe("active");
    expect(l1IntervalText(800, 0.1, 5).level).toBe("active");
  });

  it("reads storm-like for a strongly-right field", () => {
    expect(l1IntervalText(300, -10, 5).level).toBe("storm-like");
    expect(l1IntervalText(550, -15, 5).sentence).toMatch(
      /right way for aurora and pushing hard/,
    );
  });

  it("reads storm-like for a very fast stream even when the field leans only weakly right", () => {
    expect(l1IntervalText(700, -2, 5).level).toBe("storm-like");
    expect(l1IntervalText(700, 0, 5).level).toBe("storm-like");
  });

  it("reads active for an elevated-to-fast stream with a weakly-right field", () => {
    expect(l1IntervalText(400, 0, 5).level).toBe("active");
    expect(l1IntervalText(550, -9.9, 5).level).toBe("active");
  });

  it("says no data when any feed is missing, never a half sentence and never zero", () => {
    expect(l1IntervalText(null, -15, 5).level).toBe("no-data");
    expect(l1IntervalText(550, null, 5).level).toBe("no-data");
    expect(l1IntervalText(550, -15, null).level).toBe("no-data");
    expect(l1IntervalText(null, null, null).level).toBe("no-data");
    expect(l1IntervalText(null, -15, 5).sentence).toMatch(/no data/i);
  });

  it("keys every row by level", () => {
    expect(l1IntervalText(300, 5, 5).key).toBe("l1-calm");
    expect(l1IntervalText(550, 5, 5).key).toBe("l1-active");
    expect(l1IntervalText(550, -15, 5).key).toBe("l1-storm-like");
    expect(l1IntervalText(null, null, null).key).toBe("no-data");
  });

  it("names the field's direction in plain words, never gate jargon (2026-09-13 rewording)", () => {
    for (const [speed, bz, density] of [
      [300, 5, 5],
      [550, -2, 5],
      [750, -15, 5],
    ] as const) {
      const row = l1IntervalText(speed, bz, density);
      expect(row.sentence).toMatch(/magnetic field/i);
      expect(row.sentence).toMatch(/right way|wrong way|leans/i);
      expect(row.sentence).not.toMatch(/gate/i);
    }
  });

  it("never promises a Kp outcome from a field band (N1)", () => {
    for (const [speed, bz, density] of [
      [300, 5, 5],
      [550, -2, 5],
      [750, -15, 5],
    ] as const) {
      expect(l1IntervalText(speed, bz, density).sentence).not.toMatch(/kp\s*\d/i);
    }
  });

  it("keeps likelihood language and never a tonight claim (N5)", () => {
    for (const [speed, bz, density] of [
      [300, 5, 5],
      [550, -2, 5],
      [750, -15, 5],
      [550, -12, 25],
      [700, -2, 45],
    ] as const) {
      const row = l1IntervalText(speed, bz, density);
      expect(row.sentence).toMatch(/leaning|pushing|holds|leans/i);
      expect(row.sentence).not.toMatch(/tonight/i);
    }
  });

  it("never uses the word conditions for a 1-min reading (N12)", () => {
    for (const [speed, bz, density] of [
      [300, 5, 5],
      [550, -2, 5],
      [750, -15, 5],
    ] as const) {
      expect(l1IntervalText(speed, bz, density).sentence).not.toMatch(/conditions/i);
    }
  });

  it("keeps both NOAA sources on every merged line", () => {
    expect(l1IntervalText(550, -15, 5).source).toMatch(/Solar Wind/);
    expect(l1IntervalText(550, -15, 5).source).toMatch(/Geomagnetic Storms/);
  });

  it("adds the density as its own sentence (dense >= 10 p/cm³, light below)", () => {
    expect(l1IntervalText(550, -2, 25).sentence).toMatch(
      / and dense\. The magnetic field/,
    );
    expect(l1IntervalText(550, -2, 9.9).sentence).toMatch(
      / and thin\. The magnetic field/,
    );
    // The boundary pins.
    expect(l1IntervalText(550, -2, 10).sentence).toMatch(/ and dense\./);
  });

  it("carries a polarity mark per verdict keyword, each an exact sentence substring", () => {
    // Fast + dense + weakly-right field: all three keywords good.
    const good = l1IntervalText(550, -2, 25);
    if (good.level === "no-data") throw new Error("expected a level");
    expect(good.sentence).toMatch(/running fast and dense/);
    expect(good.marks).toEqual([
      { text: "fast", polarity: "good" },
      { text: "dense", polarity: "good" },
      { text: "weakly", polarity: "good" },
    ]);
    // Slow + thin + wrong-way field: all three keywords bad.
    const bad = l1IntervalText(300, 5, 2);
    if (bad.level === "no-data") throw new Error("expected a level");
    expect(bad.sentence).toMatch(/running slow and thin/);
    expect(bad.marks).toEqual([
      { text: "slow", polarity: "bad" },
      { text: "thin", polarity: "bad" },
      { text: "wrong way", polarity: "bad" },
    ]);
  });

  it("marks never overlap or span outside their clause, and every mark occurs in its sentence", () => {
    for (const [speed, bz, density] of [
      [300, 5, 2],
      [550, -2, 25],
      [750, -15, 15],
      [700, 0, 5],
      [350, -12, 45],
    ] as const) {
      const row = l1IntervalText(speed, bz, density);
      if (row.level === "no-data") continue;
      const marks = row.marks ?? [];
      expect(marks.length).toBe(3);
      let cursor = 0;
      for (const mark of marks) {
        const at = row.sentence.indexOf(mark.text, cursor);
        expect(at).toBeGreaterThanOrEqual(0);
        cursor = at + mark.text.length;
      }
    }
  });

  it("carries no marks on the Kp rows without verdict keywords, and marks the intensity word on the calm/storm lines", () => {
    const calm = kpIntervalText(1);
    if (calm.level === "no-data") throw new Error("expected a level");
    expect(calm.sentence).toMatch(/intensity is currently low/);
    expect(calm.marks).toEqual([{ text: "low", polarity: "bad" }]);
    const storm = kpIntervalText(7.33);
    if (storm.level === "no-data") throw new Error("expected a level");
    expect(storm.marks).toEqual([{ text: "Strong", polarity: "good" }]);
    const active = kpIntervalText(4);
    if (active.level === "no-data") throw new Error("expected a level");
    expect(active.marks).toEqual([{ text: "possible", polarity: "good" }]);
  });
});

describe("overallWord - one-word verdict per selector option", () => {
  it("climbs the five-word ladder with Kp (the G-scale grade is the spine)", () => {
    expect(overallWord(0, null)).toBe("inactive");
    expect(overallWord(2.67, null)).toBe("faint");
    expect(overallWord(3.99, null)).toBe("faint");
    expect(overallWord(4, null)).toBe("moderate");
    expect(overallWord(5.33, null)).toBe("strong");
    expect(overallWord(6, null)).toBe("intense");
    expect(overallWord(9.9, null)).toBe("intense");
  });

  it("takes the STRONGEST driver, never an average", () => {
    // Kp 7 (intense) + a slow, thin, weakly-leaning stream (faint) must
    // not average down from intense.
    expect(overallWord(7, l1Word(280, -2))).toBe("intense");
    // A storm-grade wind arriving ahead of the 3-hour Kp block reads up:
    // very fast + strongly-right field caps at strong.
    expect(overallWord(1, l1Word(750, -15))).toBe("strong");
    expect(overallWord(4, l1Word(550, -2))).toBe("moderate");
  });

  it("returns null only when both inputs are missing", () => {
    expect(overallWord(null, null)).toBeNull();
    expect(overallWord(null, l1Word(550, -2))).toBe("moderate");
    expect(overallWord(5.33, null)).toBe("strong");
  });
});

describe("l1Word - the fine-graded L1 verdict word", () => {
  it("reads faint for a slow, thin, weakly-leaning stream (the human's live case)", () => {
    // 3 bad-ish readings, none good: must NOT inflate to moderate.
    expect(l1Word(280, -2)).toBe("faint");
    expect(l1Word(350, -5)).toBe("faint");
  });

  it("grades from the field's direction as the base rung", () => {
    expect(l1Word(280, 5)).toBe("inactive"); // wrong-way + slow
    expect(l1Word(550, 5)).toBe("faint"); // wrong-way + fast
    expect(l1Word(280, -2)).toBe("faint"); // weakly-right + slow
    expect(l1Word(280, -15)).toBe("moderate"); // strongly-right + slow
  });

  it("lifts one rung per speed band step, capped at strong", () => {
    expect(l1Word(400, -2)).toBe("moderate"); // weakly-right + fast
    expect(l1Word(700, -2)).toBe("strong"); // weakly-right + very fast
    expect(l1Word(750, -15)).toBe("strong"); // strongly-right + very fast, capped
    expect(l1Word(750, 5)).toBe("moderate"); // wrong-way + very fast
  });

  it("never reads intense: that word is reserved for Kp 6+", () => {
    for (const [speed, bz] of [
      [750, -15],
      [800, -25],
      [700, -10],
    ] as const) {
      expect(l1Word(speed, bz)).not.toBe("intense");
    }
  });

  it("says no word when either L1 reading is missing", () => {
    expect(l1Word(null, -2)).toBeNull();
    expect(l1Word(550, null)).toBeNull();
  });
});
