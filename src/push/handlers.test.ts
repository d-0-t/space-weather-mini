process.env.TZ = "UTC";

import { describe, expect, it, vi } from "vitest";

import {
  handleSendTest,
  handleSubscribe,
  handleUnsubscribe,
  runPoll,
  type PollFeeds,
} from "./handlers";
import {
  createMemorySubscriptionStore,
  type StoredSubscription,
} from "./subscription-store";
import type { PushPayload } from "./push-payload";
import type {
  PlanetaryKPoint,
  PlanetaryKForecastPoint,
} from "../products/noaa-planetary-k-index";
import type { RtswWindPoint, RtswMagFieldPoint } from "../products/solar-wind";
import { transitMinutes, addMinutes } from "../products/l1-readings";
import type { LiveWeather } from "./live-events";
import type { PushPlace } from "./subscription-settings";

/** The send call boundary, typed so mock calls destructure without casts. */
type SendFn = (
  record: StoredSubscription,
  payload: PushPayload,
) => Promise<{ status: number }>;

const send = vi.fn<SendFn>(async () => ({ status: 201 }));

/**
 * The weather dep the Live leg reads. The Kp and Daily scenarios carry no
 * L1 rows, so the leg cannot form a favorable word and never reaches the
 * weather fetch; a live leg that somehow did would surface as a surprise
 * extra poke the exact seenKeys assertions catch.
 */
const fetchWeather = vi.fn(async () => ({
  cloudCoverPercent: 10,
  precipitationMm: 0,
}));

const validBody = {
  subscription: {
    endpoint: "https://push.example/subscriptions/a",
    keys: { p256dh: "p256dh-key", auth: "auth-key" },
  },
  alertThreshold: 5,
  place: { latitude: 65.5848, longitude: 22.1546, shortName: "Luleå" },
  placeTimezone: "Europe/Stockholm",
  alertTypes: { daily: true, kp: true, live: true },
  gates: { cloudMaxPercent: 100, noPrecipitation: false, darknessBand: "any" },
};

const memoryDeps = () => {
  const store = createMemorySubscriptionStore();
  return { store };
};

describe("the subscribe endpoint contract (ticket 02)", () => {
  it("stores a valid settings object", async () => {
    const { store } = memoryDeps();
    const response = await handleSubscribe(validBody, { store, now: 1000 });
    expect(response.status).toBe(200);
    const all = await store.loadAll();
    expect(all).toHaveLength(1);
    expect(all[0].settings.alertThreshold).toBe(5);
    expect(all[0].savedAt).toBe(new Date(1000).toISOString());
  });

  it("rejects a malformed settings object without storing", async () => {
    const { store } = memoryDeps();
    const response = await handleSubscribe(
      { nonsense: true },
      { store, now: 1000 },
    );
    expect(response.status).toBe(400);
    expect(await store.loadAll()).toEqual([]);
  });

  it("overwrites on every re-send while keeping the dedupe state", async () => {
    const { store } = memoryDeps();
    await handleSubscribe(validBody, { store, now: 1000 });
    const existing = (await store.loadAll())[0];
    const seen: StoredSubscription = {
      ...existing,
      seenKeys: ["WARK05|2026-09-18 10:00"],
    };
    // Seeding the dedupe state through the declared test affordance.
    store.records.set("https://push.example/subscriptions/a", seen);
    const changed = { ...validBody, alertThreshold: 7 };
    const response = await handleSubscribe(changed, { store, now: 2000 });
    expect(response.status).toBe(200);
    const all = await store.loadAll();
    expect(all).toHaveLength(1);
    expect(all[0].settings.alertThreshold).toBe(7);
    expect(all[0].seenKeys).toEqual(["WARK05|2026-09-18 10:00"]);
  });
});

describe("the disable endpoint contract (ticket 02)", () => {
  it("forgets the subscription entirely", async () => {
    const { store } = memoryDeps();
    await handleSubscribe(validBody, { store, now: 1000 });
    const response = await handleUnsubscribe(
      "https://push.example/subscriptions/a",
      { store },
    );
    expect(response.status).toBe(200);
    expect(await store.loadAll()).toEqual([]);
  });

  it("rejects a missing endpoint", async () => {
    const { store } = memoryDeps();
    const response = await handleUnsubscribe("", { store });
    expect(response.status).toBe(400);
  });

  it("tolerates disabling an endpoint that was never stored", async () => {
    const { store } = memoryDeps();
    const response = await handleUnsubscribe(
      "https://push.example/subscriptions/never",
      { store },
    );
    expect(response.status).toBe(200);
  });
});

describe("the test-poke endpoint contract (ticket 02)", () => {
  it("fires one canned poke at the stored subscription", async () => {
    const { store } = memoryDeps();
    await handleSubscribe(validBody, { store, now: 1000 });
    send.mockClear();
    const response = await handleSendTest(
      "https://push.example/subscriptions/a",
      { store, send },
    );
    expect(response.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    const [record, payload] = send.mock.calls[0];
    expect(record.settings.subscription.endpoint).toBe(
      "https://push.example/subscriptions/a",
    );
    expect(payload.key.startsWith("test:")).toBe(true);
    expect(payload.title.length).toBeGreaterThan(0);
    expect(payload.ttlSeconds).toBe(60 * 60);
  });

  it("answers 404 for an endpoint that was never stored", async () => {
    const { store } = memoryDeps();
    const neverSend = vi.fn<SendFn>(async () => ({ status: 201 }));
    const response = await handleSendTest(
      "https://push.example/subscriptions/never",
      { store, send: neverSend },
    );
    expect(response.status).toBe(404);
    expect(neverSend).not.toHaveBeenCalled();
  });

  it("prunes the subscription when the push service reports it gone", async () => {
    const { store } = memoryDeps();
    await handleSubscribe(validBody, { store, now: 1000 });
    const gone = vi.fn<SendFn>(async () => ({ status: 410 }));
    const response = await handleSendTest(
      "https://push.example/subscriptions/a",
      { store, send: gone },
    );
    expect(response.status).toBe(410);
    expect(await store.loadAll()).toEqual([]);
  });
});

describe("the scheduled poll's Kp fan-out (ticket 03)", () => {
  const NOW = Date.parse("2026-09-18T18:30:00Z");

  const observedPoint = (timeTag: string, kp: number): PlanetaryKPoint => ({
    time_tag: timeTag,
    Kp: kp,
    a_running: 0,
    station_count: 8,
  });

  const forecastPoint = (
    timeTag: string,
    kp: number,
  ): PlanetaryKForecastPoint => ({
    time_tag: timeTag,
    kp,
    observed: "predicted",
    noaa_scale: null,
  });

  const feeds = (observed: PlanetaryKPoint[], forecast: PlanetaryKForecastPoint[]): PollFeeds => ({
    observed,
    forecast,
    wind: [],
    mag: [],
  });

  const currentFeeds = () =>
    feeds(
      [observedPoint("2026-09-18T18:00:00", 5.33)],
      [forecastPoint("2026-09-19T03:00:00", 5.67)],
    );

const send = vi.fn<SendFn>(async () => ({ status: 201 }));

  /** A second poll reusing an already-subscribed store. */
  const repeatPoll = async (
    store: ReturnType<typeof createMemorySubscriptionStore>,
    feeds: PollFeeds,
    now: number = NOW,
  ) => {
    send.mockClear();
    return {
      store,
      summary: await runPoll({
        store,
        send,
        fetchWeather,
        fetchFeeds: vi.fn(async () => feeds),
        now,
      }),
    };
  };

  /** A fresh subscription plus one poll over the given feeds. */
  const freshPoll = async (feeds: PollFeeds, now: number = NOW) => {
    const { store } = memoryDeps();
    await handleSubscribe(validBody, { store, now: 1000 });
    send.mockClear();
    return {
      store,
      summary: await runPoll({
        store,
        send,
        fetchWeather,
        fetchFeeds: vi.fn(async () => feeds),
        now,
      }),
    };
  };

  it("sends one poke per breaching leg, honestly labeled", async () => {
    const { store, summary } = await freshPoll(currentFeeds());
    expect(send).toHaveBeenCalledTimes(2);
    const pokes = send.mock.calls.map(([, payload]) => payload);
    const byTitle = Object.fromEntries(pokes.map((p) => [p.title, p]));
    expect(Object.keys(byTitle).sort()).toEqual([
      "Kp 5.33 Observed",
      "Kp 5.67 Predicted",
    ]);
    expect(byTitle["Kp 5.33 Observed"]).toMatchObject({
      key: "noaa-planetary-k-index|2026-09-18T18:00:00|Kp5",
      ttlSeconds: 60 * 60,
    });
    expect(byTitle["Kp 5.67 Predicted"]).toMatchObject({
      key: "noaa-planetary-k-index-forecast|2026-09-19T03:00:00|Kp5",
      ttlSeconds: 12 * 60 * 60,
    });
    expect(summary.sent).toBe(2);
    const record = (await store.loadAll())[0];
    expect(record.seenKeys).toEqual([
      "noaa-planetary-k-index|2026-09-18T18:00:00|Kp5",
      "noaa-planetary-k-index-forecast|2026-09-19T03:00:00|Kp5",
    ]);
    expect(record.savedAt).toBe(new Date(1000).toISOString());
  });

  it("sends nothing when a repeat poll finds no change", async () => {
    const first = await freshPoll(currentFeeds());
    expect(first.summary.sent).toBe(2);
    const { store, summary } = await repeatPoll(first.store, currentFeeds());
    expect(send).not.toHaveBeenCalled();
    expect(summary.sent).toBe(0);
    const record = (await store.loadAll())[0];
    expect(record.seenKeys).toEqual([
      "noaa-planetary-k-index|2026-09-18T18:00:00|Kp5",
      "noaa-planetary-k-index-forecast|2026-09-19T03:00:00|Kp5",
    ]);
  });

  it("re-pokes once when the observed value escalates a step", async () => {
    const first = await freshPoll(currentFeeds());
    const escalated = feeds(
      [observedPoint("2026-09-18T18:00:00", 6.33)],
      [forecastPoint("2026-09-19T03:00:00", 5.67)],
    );
    const { store, summary } = await repeatPoll(first.store, escalated);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][1]).toMatchObject({
      key: "noaa-planetary-k-index|2026-09-18T18:00:00|Kp6",
      title: "Kp 6.33 Observed",
    });
    expect(summary.sent).toBe(1);
    const record = (await store.loadAll())[0];
    expect(record.seenKeys).toContain(
      "noaa-planetary-k-index|2026-09-18T18:00:00|Kp6",
    );
  });

  it("stays silent below the threshold and touches no store state", async () => {
    const { store, summary } = await freshPoll(
      feeds(
        [observedPoint("2026-09-18T18:00:00", 4.67)],
        [forecastPoint("2026-09-19T03:00:00", 4.67)],
      ),
    );
    expect(send).not.toHaveBeenCalled();
    expect(summary.sent).toBe(0);
    const record = (await store.loadAll())[0];
    expect(record.seenKeys).toEqual([]);
  });

  it("sends nothing for a chaser with the Kp alert toggled off", async () => {
    const { store } = memoryDeps();
    await handleSubscribe(
      { ...validBody, alertTypes: { daily: true, kp: false, live: true } },
      { store, now: 1000 },
    );
    send.mockClear();
    const summary = await runPoll({
      store,
      send,
      fetchWeather,
      fetchFeeds: vi.fn(async () => currentFeeds()),
      now: NOW,
    });
    expect(send).not.toHaveBeenCalled();
    expect(summary.sent).toBe(0);
  });

  it("prunes the record when the push service reports it gone", async () => {
    const { store } = memoryDeps();
    await handleSubscribe(validBody, { store, now: 1000 });
    send.mockClear();
    const gone = vi.fn<SendFn>(async () => ({ status: 410 }));
    const summary = await runPoll({
      store,
      send: gone,
      fetchWeather,
      fetchFeeds: vi.fn(async () => currentFeeds()),
      now: NOW,
    });
    expect(gone).toHaveBeenCalledTimes(1);
    expect(summary.sent).toBe(0);
    expect(await store.loadAll()).toEqual([]);
  });

  it("records no dedupe key when a send fails, so the next poll retries", async () => {
    const { store } = memoryDeps();
    await handleSubscribe(validBody, { store, now: 1000 });
    send.mockClear();
    const failing = vi.fn<SendFn>(async () => ({ status: 500 }));
    await runPoll({
      store,
      send: failing,
      fetchWeather,
      fetchFeeds: vi.fn(async () => currentFeeds()),
      now: NOW,
    });
    const record = (await store.loadAll())[0];
    expect(record.seenKeys).toEqual([]);
  });
});

describe("the scheduled poll's Daily outlook fan-out (ticket 04)", () => {
  /** 2026-09-18 08:30 Luleå – inside the morning–lunch send window. */
  const MORNING = Date.parse("2026-09-18T06:30:00Z");

  const observedPoint = (timeTag: string, kp: number): PlanetaryKPoint => ({
    time_tag: timeTag,
    Kp: kp,
    a_running: 0,
    station_count: 8,
  });

  const forecastPoint = (
    timeTag: string,
    kp: number,
  ): PlanetaryKForecastPoint => ({
    time_tag: timeTag,
    kp,
    observed: "predicted",
    noaa_scale: null,
  });

  const feeds = (
    observed: PlanetaryKPoint[],
    forecast: PlanetaryKForecastPoint[],
  ): PollFeeds => ({ observed, forecast, wind: [], mag: [] });

  /** Quiet observed leg; the forecast breaches tonight at Luleå. */
  const tonightFeeds = () =>
    feeds(
      [observedPoint("2026-09-18T06:00:00", 2.0)],
      [forecastPoint("2026-09-18T21:00:00", 5.33)],
    );

  /** The daily-only subscriber: Kp and live legs off, so one poke per poll. */
  const dailyOnlyBody = {
    ...validBody,
    alertTypes: { daily: true, kp: false, live: false },
  };

  /** A fresh daily-only subscription plus one poll, inside the window. */
  const freshDailyPoll = async (
    body: object = dailyOnlyBody,
    now: number = MORNING,
    pollFeeds: PollFeeds = tonightFeeds(),
  ) => {
    const { store } = memoryDeps();
    await handleSubscribe(body, { store, now: 1000 });
    send.mockClear();
    return {
      store,
      summary: await runPoll({
        store,
        send,
        fetchWeather,
        fetchFeeds: vi.fn(async () => pollFeeds),
        now,
      }),
    };
  };

  it("sends the daily outlook once inside the morning–lunch window, at the daily kind's TTL", async () => {
    const { store, summary } = await freshDailyPoll();
    expect(summary.sent).toBe(1);
    expect(send).toHaveBeenCalledTimes(1);
    const [record, payload] = send.mock.calls[0];
    expect(record.settings.subscription.endpoint).toBe(
      "https://push.example/subscriptions/a",
    );
    expect(payload).toMatchObject({
      title: "Tonight Kp 5.33 expected",
      body: "Darkest at Luleå 22:01–02:50.",
      key: "daily-outlook|2026-09-18",
      ttlSeconds: 12 * 60 * 60,
    });
    const stored = (await store.loadAll())[0];
    expect(stored.seenKeys).toEqual(["daily-outlook|2026-09-18"]);
  });

  it("sends nothing on the next poll of the same place-local day", async () => {
    const first = await freshDailyPoll();
    expect(first.summary.sent).toBe(1);
    send.mockClear();
    const summary = await runPoll({
      store: first.store,
      send,
      fetchWeather,
      fetchFeeds: vi.fn(async () => tonightFeeds()),
      now: Date.parse("2026-09-18T08:00:00Z"),
    });
    expect(send).not.toHaveBeenCalled();
    expect(summary.sent).toBe(0);
    const stored = (await first.store.loadAll())[0];
    expect(stored.seenKeys).toEqual(["daily-outlook|2026-09-18"]);
  });

  it("sends no outlook outside the send window, while the Kp legs still fire", async () => {
    // 15:00 Luleå – outside the morning–lunch window; the observed leg
    // breaches and the forecast leg stays within 24h.
    const { store, summary } = await freshDailyPoll(
      validBody,
      Date.parse("2026-09-18T13:00:00Z"),
      feeds(
        [observedPoint("2026-09-18T12:00:00", 5.33)],
        [forecastPoint("2026-09-18T21:00:00", 5.33)],
      ),
    );
    const titles = send.mock.calls.map(([, payload]) => payload.title);
    expect(titles.sort()).toEqual(["Kp 5.33 Observed", "Kp 5.33 Predicted"]);
    expect(titles).not.toContain("Tonight Kp 5.33 expected");
    const stored = (await store.loadAll())[0];
    expect(stored.seenKeys.every((key) => key.startsWith("noaa-"))).toBe(true);
  });

  it("sends nothing for a chaser with the daily alert toggled off", async () => {
    const { summary } = await freshDailyPoll({
      ...validBody,
      alertTypes: { daily: false, kp: false, live: true },
    });
    expect(send).not.toHaveBeenCalled();
    expect(summary.sent).toBe(0);
  });

  it("sends nothing on a quiet night", async () => {
    const { summary } = await freshDailyPoll(
      dailyOnlyBody,
      MORNING,
      feeds(
        [observedPoint("2026-09-18T06:00:00", 2.0)],
        [forecastPoint("2026-09-18T21:00:00", 4.67)],
      ),
    );
    expect(send).not.toHaveBeenCalled();
    expect(summary.sent).toBe(0);
  });

  it("records no daily key when the send fails, so a later poll in the window retries", async () => {
    const { store } = memoryDeps();
    await handleSubscribe(dailyOnlyBody, { store, now: 1000 });
    send.mockClear();
    const failing = vi.fn<SendFn>(async () => ({ status: 500 }));
    await runPoll({
      store,
      send: failing,
      fetchWeather,
      fetchFeeds: vi.fn(async () => tonightFeeds()),
      now: MORNING,
    });
    expect((await store.loadAll())[0].seenKeys).toEqual([]);
    const retried = await runPoll({
      store,
      send,
      fetchWeather,
      fetchFeeds: vi.fn(async () => tonightFeeds()),
      now: Date.parse("2026-09-18T08:00:00Z"),
    });
    expect(retried.sent).toBe(1);
    expect((await store.loadAll())[0].seenKeys).toEqual([
      "daily-outlook|2026-09-18",
    ]);
  });

  it("prunes the record when the push service reports it gone", async () => {
    const { store } = memoryDeps();
    await handleSubscribe(dailyOnlyBody, { store, now: 1000 });
    send.mockClear();
    const gone = vi.fn<SendFn>(async () => ({ status: 410 }));
    const summary = await runPoll({
      store,
      send: gone,
      fetchWeather,
      fetchFeeds: vi.fn(async () => tonightFeeds()),
      now: MORNING,
    });
    expect(gone).toHaveBeenCalledTimes(1);
    expect(summary.sent).toBe(0);
    expect(await store.loadAll()).toEqual([]);
  });

  it("keeps both the Kp and the daily keys when both fire in one poll", async () => {
    const { store, summary } = await freshDailyPoll(
      validBody,
      MORNING,
      feeds(
        [observedPoint("2026-09-18T06:00:00", 2.0)],
        [forecastPoint("2026-09-18T21:00:00", 5.33)],
      ),
    );
    expect(summary.sent).toBe(2);
    const payloads = send.mock.calls.map(([, payload]) => payload);
    expect(payloads.map((p) => p.title).sort()).toEqual([
      "Kp 5.33 Predicted",
      "Tonight Kp 5.33 expected",
    ]);
    const stored = (await store.loadAll())[0];
    expect(stored.seenKeys).toEqual([
      "noaa-planetary-k-index-forecast|2026-09-18T21:00:00|Kp5",
      "daily-outlook|2026-09-18",
    ]);
  });
});

describe("the scheduled poll's Live fan-out (ticket 05)", () => {
  const NOW = Date.parse("2026-09-18T18:30:00Z");

  const observedPoint = (timeTag: string, kp: number): PlanetaryKPoint => ({
    time_tag: timeTag,
    Kp: kp,
    a_running: 0,
    station_count: 8,
  });

  const forecastPoint = (timeTag: string, kp: number): PlanetaryKForecastPoint => ({
    time_tag: timeTag,
    kp,
    observed: "predicted",
    noaa_scale: null,
  });

  /**
   * The reading arriving at Earth now: the freshest 1-min measurement at
   * 18:20 UTC, the averaged anchor `transit` minutes behind it – a row on
   * both instants keeps the 5-minute average alive.
   */
  const windRows = (speed = 500, density = 5): RtswWindPoint[] => {
    const freshest = "2026-09-18T18:20:00";
    const anchor = `${addMinutes(freshest, -transitMinutes(speed))}:00`;
    return [
      { time_tag: anchor, speed, density, source: "IMAP" },
      { time_tag: freshest, speed, density, source: "IMAP" },
    ];
  };

  const magRows = (bz: number, speed = 500): RtswMagFieldPoint[] => {
    const freshest = "2026-09-18T18:20:00";
    const anchor = `${addMinutes(freshest, -transitMinutes(speed))}:00`;
    return [
      { time_tag: anchor, bt: 18, bz_gsm: bz },
      { time_tag: freshest, bt: 18, bz_gsm: bz },
    ];
  };

  const LULEÅ: PushPlace = {
    latitude: 65.5848,
    longitude: 22.1546,
    shortName: "Luleå",
  };

  /** Clear, dry weather the gates pass. */
  const clearWeather = (): LiveWeather => ({
    cloudCoverPercent: 10,
    precipitationMm: 0,
  });

  /** Live-only feeds: quiet Kp legs, favorable L1 (southward, fast). */
  const liveFeeds = (): PollFeeds => ({
    observed: [observedPoint("2026-09-18T18:00:00", 4.33)],
    forecast: [],
    wind: windRows(),
    mag: magRows(-15),
  });

  /** A live-only subscriber with daytime-permissive darkness and a 50%
   * cloud limit the gates-withhold test can close the sky against. */
  const liveBody = {
    ...validBody,
    place: { ...LULEÅ },
    gates: { cloudMaxPercent: 50, noPrecipitation: false, darknessBand: "any" },
  };

  const freshLivePoll = async (
    body: object = liveBody,
    pollFeeds: PollFeeds = liveFeeds(),
    now: number = NOW,
  ) => {
    const { store } = memoryDeps();
    await handleSubscribe(body, { store, now: 1000 });
    send.mockClear();
    const fetchWeather = vi.fn(async () => clearWeather());
    const summary = await runPoll({
      store,
      send,
      fetchWeather,
      fetchFeeds: vi.fn(async () => pollFeeds),
      now,
    });
    return { store, summary, fetchWeather };
  };

  it("sends the live poke at the live kind's hour TTL, keyed live|slot|word", async () => {
    const { store, summary } = await freshLivePoll();
    expect(summary.sent).toBe(1);
    expect(send).toHaveBeenCalledTimes(1);
    const [record, payload] = send.mock.calls[0];
    expect(record.settings.subscription.endpoint).toBe(
      "https://push.example/subscriptions/a",
    );
    expect(payload).toMatchObject({
      title: "Aurora looks strong at Luleå",
      body: "The shared verdict word turned strong; the sky at Luleå passes your gates.",
      key: "live|2026-09-18T18:00:00|strong",
      ttlSeconds: 60 * 60,
    });
    const stored = (await store.loadAll())[0];
    expect(stored.seenKeys).toEqual(["live|2026-09-18T18:00:00|strong"]);
  });

  it("sends nothing on a repeat poll of the same conditions", async () => {
    const first = await freshLivePoll();
    expect(first.summary.sent).toBe(1);
    send.mockClear();
    const summary = await runPoll({
      store: first.store,
      send,
      fetchFeeds: vi.fn(async () => liveFeeds()),
      fetchWeather: vi.fn(async () => clearWeather()),
      now: Date.parse("2026-09-18T18:35:00Z"),
    });
    expect(send).not.toHaveBeenCalled();
    expect(summary.sent).toBe(0);
  });

  it("sends nothing for a chaser with the live alert toggled off, without fetching weather", async () => {
    const { summary, fetchWeather } = await freshLivePoll({
      ...liveBody,
      alertTypes: { daily: false, kp: false, live: false },
    });
    expect(send).not.toHaveBeenCalled();
    expect(summary.sent).toBe(0);
    expect(fetchWeather).not.toHaveBeenCalled();
  });

  it("does not fetch weather for a chaser whose word stays below favorable", async () => {
    // A northward field with a slow stream caps the word at faint.
    const { fetchWeather } = await freshLivePoll(
      liveBody,
      {
        observed: [observedPoint("2026-09-18T18:00:00", 4.33)],
        forecast: [],
        wind: windRows(300),
        mag: magRows(5),
      },
      NOW,
    );
    expect(send).not.toHaveBeenCalled();
    expect(fetchWeather).not.toHaveBeenCalled();
  });

  it("stays silent when the weather fetch fails, while the Kp leg still fires", async () => {
    const failingWeather = vi.fn(async () => {
      throw new Error("Open-Meteo returned 500");
    });
    const { store } = memoryDeps();
    await handleSubscribe(validBody, { store, now: 1000 });
    send.mockClear();
    const summary = await runPoll({
      store,
      send,
      fetchWeather: failingWeather,
      fetchFeeds: vi.fn(async () => ({
        observed: [observedPoint("2026-09-18T18:00:00", 5.33)],
        forecast: [],
        wind: windRows(),
        mag: magRows(-15),
      })),
      now: NOW,
    });
    expect(summary.sent).toBe(1);
    expect(send.mock.calls[0][1].title).toBe("Kp 5.33 Observed");
    expect(failingWeather).toHaveBeenCalledTimes(1);
    const stored = (await store.loadAll())[0];
    expect(stored.seenKeys).toEqual([
      "noaa-planetary-k-index|2026-09-18T18:00:00|Kp5",
    ]);
  });

  it("records no live key when the gates withhold the poke", async () => {
    const { store, summary, fetchWeather } = await freshLivePoll(
      liveBody,
      liveFeeds(),
      NOW,
    );
    void summary;
    expect(fetchWeather).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
    // The sky closes at the chaser's own cloud limit: nothing pokes, and the
    // withheld moment records nothing.
    send.mockClear();
    await runPoll({
      store,
      send,
      fetchFeeds: vi.fn(async () => liveFeeds()),
      fetchWeather: vi.fn(async () => ({
        cloudCoverPercent: 50,
        precipitationMm: 0,
      })),
      now: Date.parse("2026-09-18T18:40:00Z"),
    });
    expect(send).not.toHaveBeenCalled();
    const stored = (await store.loadAll())[0];
    expect(stored.seenKeys).toEqual(["live|2026-09-18T18:00:00|strong"]);
    // A fresh subscription under the closed sky never pokes nor records.
    const fresh = memoryDeps();
    await handleSubscribe(liveBody, { store: fresh.store, now: 1000 });
    const blockedSend = vi.fn<SendFn>(async () => ({ status: 201 }));
    await runPoll({
      store: fresh.store,
      send: blockedSend,
      fetchFeeds: vi.fn(async () => liveFeeds()),
      fetchWeather: vi.fn(async () => ({
        cloudCoverPercent: 50,
        precipitationMm: 0,
      })),
      now: NOW,
    });
    expect(blockedSend).not.toHaveBeenCalled();
    expect((await fresh.store.loadAll())[0].seenKeys).toEqual([]);
  });

  it("fans the Kp and live pokes out of one poll and keeps both keys", async () => {
    const { store, summary } = await freshLivePoll(
      liveBody,
      {
        observed: [observedPoint("2026-09-18T18:00:00", 5.33)],
        forecast: [],
        wind: windRows(),
        mag: magRows(-15),
      },
      NOW,
    );
    expect(summary.sent).toBe(2);
    const payloads = send.mock.calls.map(([, payload]) => payload);
    expect(payloads.map((p) => p.title).sort()).toEqual([
      "Aurora looks strong at Luleå",
      "Kp 5.33 Observed",
    ]);
    const stored = (await store.loadAll())[0];
    expect(stored.seenKeys).toEqual([
      "noaa-planetary-k-index|2026-09-18T18:00:00|Kp5",
      "live|2026-09-18T18:00:00|strong",
    ]);
  });
});
