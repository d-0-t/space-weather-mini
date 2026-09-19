process.env.TZ = "UTC";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_GATES,
  type HindranceGates,
  type PushPlace,
} from "./subscription-settings";
import type { PlanetaryKPoint } from "../products/noaa-planetary-k-index";
import type { RtswWindPoint, RtswMagFieldPoint } from "../products/solar-wind";
import {
  matchLiveEvents,
  darknessPasses,
  liveEventKey,
} from "./live-events";
import { transitMinutes, addMinutes } from "../products/l1-readings";

const LULEÅ: PushPlace = {
  latitude: 65.5848,
  longitude: 22.1546,
  shortName: "Luleå",
};

const OSLO: PushPlace = {
  latitude: 59.91,
  longitude: 10.75,
  shortName: "Oslo",
};

const observedPoint = (timeTag: string, kp: number): PlanetaryKPoint => ({
  time_tag: timeTag,
  Kp: kp,
  a_running: 0,
  station_count: 8,
});

/** 2026-09-18 18:30 UTC – the current observed 3-hour slot in most scenarios. */
const NOW = Date.parse("2026-09-18T18:30:00Z");

/**
 * The reading arriving at Earth now (the Summary's default "Now" rule): the
 * freshest 1-min measurement sits at 18:20 UTC; the averaged anchor sits
 * `transit` minutes behind it, so the fixture keeps a row on both instants
 * and the 5-minute average always has readings.
 */
const windRows = (
  speed = 500,
  density = 5,
  freshest = "2026-09-18T18:20:00",
): RtswWindPoint[] => {
  const anchor = `${addMinutes(freshest, -transitMinutes(speed))}:00`;
  return [
    { time_tag: anchor, speed, density, source: "IMAP" },
    { time_tag: freshest, speed, density, source: "IMAP" },
  ];
};

const magRows = (
  bz: number,
  speed = 500,
  freshest = "2026-09-18T18:20:00",
): RtswMagFieldPoint[] => {
  const anchor = `${addMinutes(freshest, -transitMinutes(speed))}:00`;
  return [
    { time_tag: anchor, bt: 18, bz_gsm: bz },
    { time_tag: freshest, bt: 18, bz_gsm: bz },
  ];
};

describe("the Live alert matcher – the shared verdict word (ticket 05)", () => {
  it("pokes when the shared word turns favorable, speaking the word", () => {
    // Kp 4.33 grades "moderate"; a southward field with a fast stream grades
    // "strong" – the strongest driver's word is favorable → poke.
    const events = matchLiveEvents({
      observed: [observedPoint("2026-09-18T18:00:00", 4.33)],
      wind: windRows(),
      mag: magRows(-15),
      place: LULEÅ,
      gates: { ...DEFAULT_GATES, darknessBand: "any" },
      weather: { cloudCoverPercent: 10, precipitationMm: 0 },
      seenKeys: [],
      now: NOW,
    });
    expect(events).toEqual([
      {
        key: "live|2026-09-18T18:00:00|strong",
        poke: true,
        title: "Aurora looks strong at Luleå",
        body: "The shared verdict word turned strong; the sky at Luleå passes your gates.",
      },
    ]);
  });

  it("stays silent when the observed Kp is missing – the word needs both drivers", () => {
    const events = matchLiveEvents({
      observed: [],
      wind: windRows(),
      mag: magRows(-15),
      place: LULEÅ,
      gates: { ...DEFAULT_GATES, darknessBand: "any" },
      weather: { cloudCoverPercent: 10, precipitationMm: 0 },
      seenKeys: [],
      now: NOW,
    });
    expect(events).toEqual([]);
  });

  it("stays silent when the L1 readings are missing", () => {
    const events = matchLiveEvents({
      observed: [observedPoint("2026-09-18T18:00:00", 4.33)],
      wind: [],
      mag: [],
      place: LULEÅ,
      gates: { ...DEFAULT_GATES, darknessBand: "any" },
      weather: { cloudCoverPercent: 10, precipitationMm: 0 },
      seenKeys: [],
      now: NOW,
    });
    expect(events).toEqual([]);
  });

  it("stays silent when the freshest wind row carries no speed reading", () => {
    // The Summary shows no word for an option whose freshest row is null;
    // the sender stays silent the same way instead of anchoring "Now" at
    // the freshest measurement.
    const trailingNull = [...windRows(), null as unknown as RtswWindPoint];
    const events = matchLiveEvents({
      observed: [observedPoint("2026-09-18T18:00:00", 4.33)],
      wind: trailingNull,
      mag: magRows(-15),
      place: LULEÅ,
      gates: { ...DEFAULT_GATES, darknessBand: "any" },
      weather: { cloudCoverPercent: 10, precipitationMm: 0 },
      seenKeys: [],
      now: NOW,
    });
    expect(events).toEqual([]);
  });

  it("stays silent when the density reading is missing – the Summary's word needs all three L1 readings", () => {
    const noDensity = windRows().map((row) => ({ ...row, density: null }));
    const events = matchLiveEvents({
      observed: [observedPoint("2026-09-18T18:00:00", 4.33)],
      wind: noDensity,
      mag: magRows(-15),
      place: LULEÅ,
      gates: { ...DEFAULT_GATES, darknessBand: "any" },
      weather: { cloudCoverPercent: 10, precipitationMm: 0 },
      seenKeys: [],
      now: NOW,
    });
    expect(events).toEqual([]);
  });

  it("stays silent below the favorable word, without recording keys", () => {
    // A northward field caps the word at faint however the Kp reads.
    const events = matchLiveEvents({
      observed: [observedPoint("2026-09-18T18:00:00", 4.33)],
      wind: windRows(300),
      mag: magRows(5),
      place: LULEÅ,
      gates: { ...DEFAULT_GATES, darknessBand: "any" },
      weather: { cloudCoverPercent: 10, precipitationMm: 0 },
      seenKeys: [],
      now: NOW,
    });
    expect(events).toEqual([]);
  });
});

describe("the Live alert matcher – the hindrance gates (ticket 05)", () => {
  const favorableInput = {
    observed: [observedPoint("2026-09-18T18:00:00", 4.33)],
    wind: windRows(),
    mag: magRows(-15),
    gates: { ...DEFAULT_GATES, darknessBand: "any" as const },
    seenKeys: [] as string[],
  };

  it("withholds at the chaser's own cloud limit and passes below it (ticket 06 review)", () => {
    // The gate is the percentage alone: 100 means only a fully overcast
    // sky withholds, so the review's default never blocks short of that.
    const blocked = matchLiveEvents({
      ...favorableInput,
      place: LULEÅ,
      gates: { ...DEFAULT_GATES, cloudMaxPercent: 50 },
      weather: { cloudCoverPercent: 50, precipitationMm: 0 },
      now: NOW,
    });
    expect(blocked).toEqual([]);
    const below = matchLiveEvents({
      ...favorableInput,
      place: LULEÅ,
      gates: { ...DEFAULT_GATES, cloudMaxPercent: 50 },
      weather: { cloudCoverPercent: 49.9, precipitationMm: 0 },
      now: NOW,
    });
    expect(below).toHaveLength(1);
    const defaultPass = matchLiveEvents({
      ...favorableInput,
      place: LULEÅ,
      weather: { cloudCoverPercent: 99, precipitationMm: 0 },
      now: NOW,
    });
    expect(defaultPass).toHaveLength(1);
  });

  it("withholds while it precipitates at the place and the gate is on", () => {
    const events = matchLiveEvents({
      ...favorableInput,
      place: LULEÅ,
      gates: { ...DEFAULT_GATES, noPrecipitation: true },
      weather: { cloudCoverPercent: 10, precipitationMm: 0.2 },
      now: NOW,
    });
    expect(events).toEqual([]);
  });

  it("ignores precipitation when the no-precipitation gate is off", () => {
    const events = matchLiveEvents({
      ...favorableInput,
      place: LULEÅ,
      gates: { ...DEFAULT_GATES, noPrecipitation: false, darknessBand: "any" },
      weather: { cloudCoverPercent: 10, precipitationMm: 1.5 },
      now: NOW,
    });
    expect(events).toHaveLength(1);
  });

  it("withholds while precipitation is unknown – an unknown sky never guesses", () => {
    const events = matchLiveEvents({
      ...favorableInput,
      place: LULEÅ,
      gates: { ...DEFAULT_GATES, noPrecipitation: true },
      weather: { cloudCoverPercent: 10, precipitationMm: null },
      now: NOW,
    });
    expect(events).toEqual([]);
  });

  it("passes at the permissive defaults: no precip gate, no darkness gate (ticket 06 review)", () => {
    const events = matchLiveEvents({
      ...favorableInput,
      place: LULEÅ,
      weather: { cloudCoverPercent: 99, precipitationMm: 5 },
      now: NOW,
    });
    expect(events).toHaveLength(1);
  });

  it("stays silent when no weather reading arrived", () => {
    const events = matchLiveEvents({
      ...favorableInput,
      place: LULEÅ,
      weather: null,
      now: NOW,
    });
    expect(events).toEqual([]);
  });

  it("fires at Luleå's solstice midnight – deep night passes the astronomical gate", () => {
    // Luleå, 2026-12-21 22:00 UTC (local midnight): the sun sits far below
    // −18°, so even the strict Night band passes.
    const events = matchLiveEvents({
      ...favorableInput,
      place: LULEÅ,
      gates: DEFAULT_GATES,
      weather: { cloudCoverPercent: 10, precipitationMm: 0 },
      now: Date.parse("2026-12-21T22:00:00Z"),
    });
    expect(events).toHaveLength(1);
  });

  it("withholds in pinned civil twilight at night bands, and Any includes daytime", () => {
    // Oslo, 2026-09-15 ~17:55Z: pinned civil twilight (0 to −6° below the
    // horizon) in src/data/sun.test.ts – every real darkness band withholds.
    for (const band of ["night", "astronomical", "nautical"] as const) {
      const events = matchLiveEvents({
        ...favorableInput,
        place: OSLO,
        gates: { ...DEFAULT_GATES, darknessBand: band },
        weather: { cloudCoverPercent: 10, precipitationMm: 0 },
        now: Date.parse("2026-09-15T17:55:00Z"),
      });
      expect(events).toEqual([]);
    }
    const anyBand = matchLiveEvents({
      ...favorableInput,
      place: OSLO,
      gates: { ...DEFAULT_GATES, darknessBand: "any" },
      weather: { cloudCoverPercent: 10, precipitationMm: 0 },
      now: Date.parse("2026-09-15T17:55:00Z"),
    });
    expect(anyBand).toHaveLength(1);
  });
});

describe("darknessPasses – the band thresholds (ticket 05)", () => {
  it("passes Night only at −18° or below", () => {
    expect(darknessPasses("night", -18)).toBe(true);
    expect(darknessPasses("night", -17.9)).toBe(false);
  });

  it("passes Astronomical Twilight at −12° or below", () => {
    expect(darknessPasses("astronomical", -12)).toBe(true);
    expect(darknessPasses("astronomical", -11.9)).toBe(false);
  });

  it("passes Nautical Twilight at −6° or below", () => {
    expect(darknessPasses("nautical", -6)).toBe(true);
    expect(darknessPasses("nautical", -5.9)).toBe(false);
  });

  it("passes Any at every elevation, including daytime", () => {
    expect(darknessPasses("any", 10)).toBe(true);
    expect(darknessPasses("any", 0)).toBe(true);
  });
});

describe("the Live alert matcher – dedupe and re-pokes (ticket 05)", () => {
  /**
   * A moderate word: Kp 4.33 grades "moderate", a weakly-right field with a
   * fast stream grades "faint" + one lift → the word is "moderate" – the
   * favorable pivot itself.
   */
  const moderateInput = {
    observed: [observedPoint("2026-09-18T18:00:00", 4.33)],
    wind: windRows(),
    mag: magRows(-5),
    place: LULEÅ,
    gates: { ...DEFAULT_GATES, darknessBand: "any" as const },
    weather: { cloudCoverPercent: 10, precipitationMm: 0 },
  };

  const matchAt = (now: number, input: typeof moderateInput, seenKeys: string[]) =>
    matchLiveEvents({ ...input, seenKeys, now });

  it("pokes once on the favorable turn, then stays silent on repeat polls", () => {
    const first = matchAt(NOW, moderateInput, []);
    expect(first).toHaveLength(1);
    const key = first[0].key;
    expect(key).toBe("live|2026-09-18T18:00:00|moderate");
    expect(matchAt(NOW, moderateInput, [key])).toEqual([]);
  });

  it("re-pokes when the word escalates a rung in the same slot", () => {
    // The L1 side lifts alone: a southward field with the same fast stream
    // grades "strong" while Kp stays put – the strongest driver's word moved.
    const escalated = {
      ...moderateInput,
      observed: [observedPoint("2026-09-18T18:00:00", 4.33)],
      wind: windRows(),
      mag: magRows(-15),
    };
    const events = matchAt(NOW, escalated, [
      "live|2026-09-18T18:00:00|moderate",
    ]);
    expect(events).toEqual([
      expect.objectContaining({
        key: "live|2026-09-18T18:00:00|strong",
        poke: true,
      }),
    ]);
  });

  it("stays silent when the word eases back a rung", () => {
    const events = matchAt(NOW, moderateInput, [
      "live|2026-09-18T18:00:00|strong",
    ]);
    expect(events).toEqual([]);
  });

  it("carries the same word into the next slot as a silent marker", () => {
    const events = matchAt(
      Date.parse("2026-09-18T21:30:00Z"),
      {
        ...moderateInput,
        observed: [observedPoint("2026-09-18T21:00:00", 4.33)],
        wind: windRows(500, 5, "2026-09-18T21:20:00"),
        mag: magRows(-5, 500, "2026-09-18T21:20:00"),
      },
      ["live|2026-09-18T18:00:00|moderate"],
    );
    expect(events).toEqual([
      {
        key: "live|2026-09-18T21:00:00|moderate",
        poke: false,
        title: "Aurora looks moderate at Luleå",
        body: "The shared verdict word turned moderate; the sky at Luleå passes your gates.",
      },
    ]);
  });

  it("re-pokes when the word returns after skipped slots (a dip or a feed gap)", () => {
    const events = matchAt(
      Date.parse("2026-09-19T00:30:00Z"),
      {
        ...moderateInput,
        observed: [observedPoint("2026-09-19T00:00:00", 4.33)],
        wind: windRows(500, 5, "2026-09-19T00:20:00"),
        mag: magRows(-5, 500, "2026-09-19T00:20:00"),
      },
      ["live|2026-09-18T18:00:00|moderate"],
    );
    expect(events).toEqual([
      expect.objectContaining({
        key: "live|2026-09-19T00:00:00|moderate",
        poke: true,
      }),
    ]);
  });
});
