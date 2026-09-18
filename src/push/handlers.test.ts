import { describe, expect, it, vi } from "vitest";

import {
  handleSendTest,
  handleSubscribe,
  handleUnsubscribe,
  runPoll,
} from "./handlers";
import {
  createMemorySubscriptionStore,
  type StoredSubscription,
} from "./subscription-store";
import type { PushPayload } from "./push-payload";

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

describe("the scheduled NOAA poll skeleton (ticket 02)", () => {
  it("polls the three feeds the app reads and sends nothing yet", async () => {
    const { store } = memoryDeps();
    await handleSubscribe(validBody, { store, now: 1000 });
    const pollSend = vi.fn<SendFn>(async () => ({ status: 201 }));
    const fetchFeeds = vi.fn(async () => ({
      alerts: 3,
      forecast: 8,
      scales: 1,
    }));
    const summary = await runPoll({ store, send: pollSend, fetchFeeds });
    expect(fetchFeeds).toHaveBeenCalledTimes(1);
    expect(summary).toEqual({
      subscriptions: 1,
      feeds: { alerts: 3, forecast: 8, scales: 1 },
      sent: 0,
    });
    expect(pollSend).not.toHaveBeenCalled();
  });

  it("keeps the store untouched when a poll finds nothing to send", async () => {
    const { store } = memoryDeps();
    await handleSubscribe(validBody, { store, now: 1000 });
    const before = await store.loadAll();
    await runPoll({
      store,
      send: vi.fn<SendFn>(async () => ({ status: 201 })),
      fetchFeeds: vi.fn(async () => ({ alerts: 0, forecast: 0, scales: 0 })),
    });
    expect(await store.loadAll()).toEqual(before);
  });
});
