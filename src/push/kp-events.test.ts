process.env.TZ = "UTC";

import { describe, expect, it } from "vitest";

import { matchKpEvents, kpEventKey } from "./kp-events";
import type {
  PlanetaryKPoint,
  PlanetaryKForecastPoint,
} from "../products/noaa-planetary-k-index";

const OBSERVED_PRODUCT = "noaa-planetary-k-index";
const FORECAST_PRODUCT = "noaa-planetary-k-index-forecast";

const observedPoint = (timeTag: string, kp: number): PlanetaryKPoint => ({
  time_tag: timeTag,
  Kp: kp,
  a_running: 0,
  station_count: 8,
});

const forecastPoint = (
  timeTag: string,
  kp: number,
  observed: PlanetaryKForecastPoint["observed"] = "predicted",
): PlanetaryKForecastPoint => ({
  time_tag: timeTag,
  kp,
  observed,
  noaa_scale: null,
});

/** 2026-09-18 18:00 UTC – the current observed 3-hour slot in most scenarios. */
const NOW = Date.parse("2026-09-18T18:30:00Z");

describe("the Kp alert matcher – observed leg (ticket 03)", () => {
  it("pokes once when the official 3-hour value breaches the threshold, labeled Observed", () => {
    const events = matchKpEvents({
      observed: [
        observedPoint("2026-09-18T12:00:00", 3.33),
        observedPoint("2026-09-18T15:00:00", 4.67),
        observedPoint("2026-09-18T18:00:00", 5.33),
      ],
      forecast: [],
      alertThreshold: 5,
      seenKeys: [],
      now: NOW,
    });
    expect(events).toEqual([
      {
        key: `${OBSERVED_PRODUCT}|2026-09-18T18:00:00|Kp5`,
        leg: "observed",
        kp: 5.33,
        poke: true,
        title: "Kp 5.33 Observed",
        body: "The official 3-hour planetary K-index reached 5.33.",
      },
    ]);
  });

  it("stays silent when the newest value is below the threshold", () => {
    const events = matchKpEvents({
      observed: [observedPoint("2026-09-18T18:00:00", 4.67)],
      forecast: [],
      alertThreshold: 5,
      seenKeys: [],
      now: NOW,
    });
    expect(events).toEqual([]);
  });

  it("never pokes for historical slots, only the newest observed value", () => {
    const events = matchKpEvents({
      observed: [
        observedPoint("2026-09-17T18:00:00", 7.0),
        observedPoint("2026-09-18T18:00:00", 2.0),
      ],
      forecast: [],
      alertThreshold: 5,
      seenKeys: [],
      now: NOW,
    });
    expect(events).toEqual([]);
  });

  it("re-pokes once when the same slot escalates a Kp step", () => {
    const slot = `${OBSERVED_PRODUCT}|2026-09-18T18:00:00|Kp5`;
    const events = matchKpEvents({
      observed: [observedPoint("2026-09-18T18:00:00", 6.33)],
      forecast: [],
      alertThreshold: 5,
      seenKeys: [slot],
      now: NOW,
    });
    expect(events).toEqual([
      {
        key: `${OBSERVED_PRODUCT}|2026-09-18T18:00:00|Kp6`,
        leg: "observed",
        kp: 6.33,
        poke: true,
        title: "Kp 6.33 Observed",
        body: "The official 3-hour planetary K-index reached 6.33.",
      },
    ]);
  });

  it("stays silent when the same slot repeats unchanged, without new keys", () => {
    const events = matchKpEvents({
      observed: [observedPoint("2026-09-18T18:00:00", 5.33)],
      forecast: [],
      alertThreshold: 5,
      seenKeys: [`${OBSERVED_PRODUCT}|2026-09-18T18:00:00|Kp5`],
      now: NOW,
    });
    expect(events).toEqual([]);
  });

  it("stays silent when an escalated slot eases back a step", () => {
    const events = matchKpEvents({
      observed: [observedPoint("2026-09-18T18:00:00", 5.33)],
      forecast: [],
      alertThreshold: 5,
      seenKeys: [`${OBSERVED_PRODUCT}|2026-09-18T18:00:00|Kp6`],
      now: NOW,
    });
    expect(events).toEqual([]);
  });

  it("stays silent when the storm carries into the next slot at the same step", () => {
    const events = matchKpEvents({
      observed: [observedPoint("2026-09-18T21:00:00", 5.33)],
      forecast: [],
      alertThreshold: 5,
      seenKeys: [`${OBSERVED_PRODUCT}|2026-09-18T18:00:00|Kp5`],
      now: Date.parse("2026-09-18T21:30:00Z"),
    });
    expect(events).toEqual([
      {
        key: `${OBSERVED_PRODUCT}|2026-09-18T21:00:00|Kp5`,
        leg: "observed",
        kp: 5.33,
        poke: false,
        title: "Kp 5.33 Observed",
        body: "The official 3-hour planetary K-index reached 5.33.",
      },
    ]);
  });

  it("re-pokes when the storm escalates in a later slot", () => {
    const events = matchKpEvents({
      observed: [observedPoint("2026-09-18T21:00:00", 6.33)],
      forecast: [],
      alertThreshold: 5,
      seenKeys: [`${OBSERVED_PRODUCT}|2026-09-18T18:00:00|Kp5`],
      now: Date.parse("2026-09-18T21:30:00Z"),
    });
    expect(events).toEqual([
      expect.objectContaining({
        key: `${OBSERVED_PRODUCT}|2026-09-18T21:00:00|Kp6`,
        poke: true,
      }),
    ]);
  });

  it("pokes again when the storm dipped below threshold and returned", () => {
    const events = matchKpEvents({
      observed: [observedPoint("2026-09-18T21:00:00", 5.33)],
      forecast: [],
      alertThreshold: 5,
      seenKeys: [`${OBSERVED_PRODUCT}|2026-09-18T12:00:00|Kp5`],
      now: Date.parse("2026-09-18T21:30:00Z"),
    });
    expect(events).toEqual([
      expect.objectContaining({
        key: `${OBSERVED_PRODUCT}|2026-09-18T21:00:00|Kp5`,
        poke: true,
      }),
    ]);
  });
});

describe("the Kp alert matcher – forecast leg (ticket 03)", () => {
  it("pokes when the forecast predicts a breach within 24h, labeled Predicted", () => {
    const events = matchKpEvents({
      observed: [],
      forecast: [
        forecastPoint("2026-09-19T03:00:00", 5.67),
        forecastPoint("2026-09-19T12:00:00", 6.33),
      ],
      alertThreshold: 5,
      seenKeys: [],
      now: NOW,
    });
    expect(events).toEqual([
      {
        key: `${FORECAST_PRODUCT}|2026-09-19T12:00:00|Kp6`,
        leg: "predicted",
        kp: 6.33,
        poke: true,
        title: "Kp 6.33 Predicted",
        body: "The Kp forecast expects 6.33 within the next 24 hours.",
      },
    ]);
  });

  it("ignores predicted breaches outside the next 24 hours", () => {
    const events = matchKpEvents({
      observed: [],
      forecast: [
        forecastPoint("2026-09-17T18:00:00", 7.0),
        forecastPoint("2026-09-19T19:00:00", 7.0),
      ],
      alertThreshold: 5,
      seenKeys: [],
      now: NOW,
    });
    expect(events).toEqual([]);
  });

  it("stays silent when the same prediction repeats on the next poll", () => {
    const events = matchKpEvents({
      observed: [],
      forecast: [forecastPoint("2026-09-19T03:00:00", 5.67)],
      alertThreshold: 5,
      seenKeys: [`${FORECAST_PRODUCT}|2026-09-19T03:00:00|Kp5`],
      now: NOW,
    });
    expect(events).toEqual([]);
  });

  it("stays silent when the window slides to a later slot at the same step", () => {
    const events = matchKpEvents({
      observed: [],
      forecast: [forecastPoint("2026-09-19T03:00:00", 5.67)],
      alertThreshold: 5,
      seenKeys: [`${FORECAST_PRODUCT}|2026-09-18T21:00:00|Kp5`],
      now: Date.parse("2026-09-18T21:30:00Z"),
    });
    expect(events).toEqual([
      expect.objectContaining({
        key: `${FORECAST_PRODUCT}|2026-09-19T03:00:00|Kp5`,
        poke: false,
      }),
    ]);
  });

  it("re-pokes when a later forecast slot escalates the step", () => {
    const events = matchKpEvents({
      observed: [],
      forecast: [forecastPoint("2026-09-19T03:00:00", 6.33)],
      alertThreshold: 5,
      seenKeys: [`${FORECAST_PRODUCT}|2026-09-18T21:00:00|Kp5`],
      now: Date.parse("2026-09-18T21:30:00Z"),
    });
    expect(events).toEqual([
      expect.objectContaining({
        key: `${FORECAST_PRODUCT}|2026-09-19T03:00:00|Kp6`,
        poke: true,
      }),
    ]);
  });

  it("re-pokes when a new predicted episode starts after the window went quiet", () => {
    const events = matchKpEvents({
      observed: [],
      forecast: [forecastPoint("2026-09-19T03:00:00", 5.67)],
      alertThreshold: 5,
      seenKeys: [`${FORECAST_PRODUCT}|2026-09-18T03:00:00|Kp5`],
      now: Date.parse("2026-09-18T22:00:00Z"),
    });
    expect(events).toEqual([
      expect.objectContaining({
        key: `${FORECAST_PRODUCT}|2026-09-19T03:00:00|Kp5`,
        poke: true,
      }),
    ]);
  });
});

describe("kpEventKey", () => {
  it("builds the product|slot|Kp-step key", () => {
    expect(kpEventKey(OBSERVED_PRODUCT, "2026-09-18 18:00:00", 5)).toBe(
      `${OBSERVED_PRODUCT}|2026-09-18T18:00:00|Kp5`,
    );
  });
});
