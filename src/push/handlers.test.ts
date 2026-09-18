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

/** The send call boundary, typed so mock calls destructure without casts. */
type SendFn = (
  record: StoredSubscription,
  payload: PushPayload,
) => Promise<{ status: number }>;

const send = vi.fn<SendFn>(async () => ({ status: 201 }));

const validBody = {
  subscription: {
    endpoint: "https://push.example/subscriptions/a",
    keys: { p256dh: "p256dh-key", auth: "auth-key" },
  },
  alertThreshold: 5,
  place: { latitude: 65.5848, longitude: 22.1546, shortName: "Luleå" },
  placeTimezone: "Europe/Stockholm",
  alertTypes: { daily: true, kp: true, live: true },
  gates: { cloudMaxPercent: 50, noPrecipitation: true, darknessBand: "astronomical" },
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
  });

  const currentFeeds = () =>
    feeds(
      [observedPoint("2026-09-18T18:00:00", 5.33)],
      [forecastPoint("2026-09-19T03:00:00", 5.67)],
    );

  const send = vi.fn<SendFn>(async () => ({ status: 201 }));

  /** A second poll reusing an already-subscribed store. */
  const repeatPoll = async (store: ReturnType<typeof createMemorySubscriptionStore>, feeds: PollFeeds) => {
    send.mockClear();
    return {
      store,
      summary: await runPoll({
        store,
        send,
        fetchFeeds: vi.fn(async () => feeds),
        now: NOW,
      }),
    };
  };

  /** A fresh subscription plus one poll over the given feeds. */
  const freshPoll = async (feeds: PollFeeds) => {
    const { store } = memoryDeps();
    await handleSubscribe(validBody, { store, now: 1000 });
    send.mockClear();
    return {
      store,
      summary: await runPoll({
        store,
        send,
        fetchFeeds: vi.fn(async () => feeds),
        now: NOW,
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
      fetchFeeds: vi.fn(async () => currentFeeds()),
      now: NOW,
    });
    const record = (await store.loadAll())[0];
    expect(record.seenKeys).toEqual([]);
  });
});
