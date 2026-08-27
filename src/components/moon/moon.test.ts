import { describe, expect, it } from "vitest";

import {
  getMoonPhase,
  moonEmojiAtMidnight,
  moonIllumination,
  moonIlluminationPercent,
  parseTimeTag,
} from "./moon";
import { enrichWithMoon } from "./moon-chart";

// Known new moon reference: 2000-01-06 18:14 UTC (Meeus)
const REF = Date.UTC(2000, 0, 6, 18, 14);
const SYNODIC_MONTH_DAYS = 29.530588853;
const DAY = 86_400_000;

describe("moon helpers", () => {
  it("computes moon phase for known dates", () => {
    expect(getMoonPhase(new Date(REF)).name).toBe("New moon");
    expect(getMoonPhase(new Date(REF + 7 * DAY)).name).toBe("Waxing crescent");
    expect(getMoonPhase(new Date(REF + 15 * DAY)).name).toBe("Full moon");
    expect(getMoonPhase(new Date(REF + 21 * DAY)).name).toBe("Waning gibbous");
    expect(getMoonPhase(new Date(REF + 26 * DAY)).name).toBe("Waning crescent");
  });

  it("illumination is 0 at new moon, 1 at full moon and back to 0 after a cycle", () => {
    expect(moonIllumination(new Date(REF))).toBeCloseTo(0, 2);
    expect(
      moonIllumination(new Date(REF + (SYNODIC_MONTH_DAYS / 2) * DAY)),
    ).toBeCloseTo(1, 2);
    expect(
      moonIllumination(new Date(REF + SYNODIC_MONTH_DAYS * DAY)),
    ).toBeCloseTo(0, 2);
  });

  it("percent rounds to 0-100 and matches the 2026-08-26 waxing gibbous phase", () => {
    const d = new Date("2026-08-26T12:00:00Z");
    expect(getMoonPhase(d).name).toBe("Waxing gibbous");
    const pct = moonIlluminationPercent(d);
    expect(pct).toBeGreaterThan(50);
    expect(pct).toBeLessThan(100);
    expect(moonIlluminationPercent(new Date(REF))).toBe(0);
  });

  it("returns the moon emoji only for midnight time tags", () => {
    // 2026-08-26 is in the waxing gibbous era
    expect(moonEmojiAtMidnight("2026-08-26T00:00:00")).toBe("🌔");
    expect(moonEmojiAtMidnight("2026-08-27T00:00:00")).not.toBeNull();
    expect(moonEmojiAtMidnight("2026-08-26T03:00:00")).toBeNull();
    expect(moonEmojiAtMidnight("2026-08-26T12:00:00")).toBeNull();
    expect(moonEmojiAtMidnight("garbage")).toBeNull();
  });

  it("handles time tags that already end in Z (toISOString output)", () => {
    // Regression: appending another Z made the date invalid, hiding the moon
    // series and crashing the tooltip phase lookup
    expect(moonEmojiAtMidnight("2026-08-26T00:00:00.000Z")).toBe("🌔");
    expect(moonIlluminationPercent(parseTimeTag("2026-08-26T12:00:00.000Z")))
      .toBeGreaterThan(0);
    expect(moonIlluminationPercent(parseTimeTag("2026-08-26T12:00:00")))
      .toBeGreaterThan(0);
  });

  it("never throws on an invalid date or empty time tag", () => {
    expect(getMoonPhase(new Date("nonsense")).name).toBe("New moon");
    expect(moonIlluminationPercent(parseTimeTag(""))).toBe(NaN);
    expect(moonEmojiAtMidnight("")).toBeNull();
  });

  it("marks an emoji on every midnight by default", () => {
    const base = Date.UTC(2026, 7, 20); // Aug 20 2026 00:00 UTC
    const points = Array.from({ length: 4 }, (_, i) => ({
      time: new Date(base + i * DAY).toISOString(),
    }));
    const enriched = enrichWithMoon(points);
    expect(enriched.every((p) => p.moonEmoji !== null)).toBe(true);
  });

  it("places phase-aligned emojis on the curve's milestone points for daily charts", () => {
    // Aug 20 – Sep 15 2026 contains a full lunar cycle (full moon Aug 28,
    // new moon Sep 12)
    const base = Date.UTC(2026, 7, 20);
    const points = Array.from({ length: 27 }, (_, i) => ({
      time: new Date(base + i * DAY).toISOString(),
    }));
    const enriched = enrichWithMoon(points, { phaseAligned: true });
    const markers = enriched
      .map((p) => ({ emoji: p.moonEmoji, moon: p.moon }))
      .filter((m): m is { emoji: string; moon: number } => m.emoji !== null);
    // One marker per phase boundary inside the window
    expect(markers.length).toBeGreaterThanOrEqual(4);
    expect(markers.length).toBeLessThanOrEqual(8);
    // The full moon emoji sits on the 100% peak, not a day late on the slope
    const full = markers.find((m) => m.emoji === "🌕");
    expect(full?.moon).toBeGreaterThanOrEqual(99);
    // The new moon emoji sits at the 0% trough
    const newMoon = markers.find((m) => m.emoji === "🌑");
    expect(newMoon?.moon).toBeLessThanOrEqual(1);
    // Quarter emojis sit at the ~50% crossings (midnight granularity ±5%)
    for (const m of markers.filter(
      (m) => m.emoji === "🌓" || m.emoji === "🌗",
    )) {
      expect(m.moon).toBeGreaterThanOrEqual(44);
      expect(m.moon).toBeLessThanOrEqual(56);
    }
    // Every point still carries an illumination value for the curve
    expect(enriched.every((p) => p.moon >= 0 && p.moon <= 100)).toBe(true);
  });
});