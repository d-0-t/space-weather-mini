import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import {
  createBlobsSubscriptionStore,
  createMemorySubscriptionStore,
  type BlobsKV,
  type StoredSubscription,
} from "./subscription-store";
import type { SubscriptionSettings } from "./subscription-settings";

const settings = (endpoint: string, threshold: number): SubscriptionSettings => ({
  subscription: {
    endpoint,
    keys: { p256dh: "p256dh-key", auth: "auth-key" },
  },
  alertThreshold: threshold,
  place: { latitude: 65.5848, longitude: 22.1546, shortName: "Luleå" },
  placeTimezone: "Europe/Stockholm",
  alertTypes: { daily: true, kp: true, live: true },
  gates: { cloudMaxPercent: 50, noPrecipitation: true, darknessBand: "astronomical" },
});

const endpointA = "https://push.example/subscriptions/a";
const endpointB = "https://push.example/subscriptions/b";

describe("the 3-method subscription store seam (ticket 02)", () => {
  it("starts empty", async () => {
    const store = createMemorySubscriptionStore();
    expect(await store.loadAll()).toEqual([]);
  });

  it("saves a subscription with its dedupe state and saved-at instant", async () => {
    const store = createMemorySubscriptionStore();
    await store.save(settings(endpointA, 5), "2026-09-18T10:00:00Z");
    const all: StoredSubscription[] = await store.loadAll();
    expect(all).toHaveLength(1);
    expect(all[0].settings.alertThreshold).toBe(5);
    expect(all[0].seenKeys).toEqual([]);
    expect(all[0].savedAt).toBe("2026-09-18T10:00:00Z");
  });

  it("overwrites blindly on a second save while keeping the dedupe keys", async () => {
    const store = createMemorySubscriptionStore();
    await store.save(settings(endpointA, 5), "2026-09-18T10:00:00Z");
    const first = (await store.loadAll())[0];
    await store.save(settings(endpointA, 7), "2026-09-18T12:00:00Z");
    const all = await store.loadAll();
    expect(all).toHaveLength(1);
    expect(all[0].settings.alertThreshold).toBe(7);
    expect(all[0].savedAt).toBe("2026-09-18T12:00:00Z");
    expect(all[0].seenKeys).toEqual(first.seenKeys);
  });

  it("removes a subscription and tolerates removing an unknown one", async () => {
    const store = createMemorySubscriptionStore();
    await store.save(settings(endpointA, 5), "2026-09-18T10:00:00Z");
    await store.remove(endpointA);
    expect(await store.loadAll()).toEqual([]);
    await expect(store.remove(endpointB)).resolves.toBeUndefined();
  });

  it("loads deterministically regardless of save order", async () => {
    const store = createMemorySubscriptionStore();
    await store.save(settings(endpointB, 5), "2026-09-18T10:00:00Z");
    await store.save(settings(endpointA, 5), "2026-09-18T10:00:00Z");
    const all = await store.loadAll();
    expect(all.map((record) => record.settings.subscription.endpoint)).toEqual([
      endpointA,
      endpointB,
    ]);
  });
});

describe("the Netlify Blobs backend over the same seam (ticket 02)", () => {
  /** The endpoint's stable storage key: its SHA-256 hex digest. */
  const keyFor = (endpoint: string): string =>
    createHash("sha256").update(endpoint).digest("hex");

  const fakeKV = (): BlobsKV => {
    const map = new Map<string, string>();
    return {
      async get(key) {
        return map.get(key) ?? null;
      },
      async set(key, value) {
        map.set(key, value);
      },
      async delete(key) {
        map.delete(key);
      },
      async list() {
        return { blobs: [...map.keys()].map((key) => ({ key })) };
      },
    };
  };

  it("round-trips a saved subscription through the KV store", async () => {
    const kv = fakeKV();
    const store = createBlobsSubscriptionStore(kv);
    await store.save(settings(endpointA, 5), "2026-09-18T10:00:00Z");
    expect(kv.get).toBeDefined();
    const all = await store.loadAll();
    expect(all).toHaveLength(1);
    expect(all[0].settings.subscription.endpoint).toBe(endpointA);
    expect(all[0].savedAt).toBe("2026-09-18T10:00:00Z");
  });

  it("keys each endpoint by its SHA-256 digest so the URL never lands raw", async () => {
    const kv = fakeKV();
    await createBlobsSubscriptionStore(kv).save(
      settings(endpointA, 5),
      "2026-09-18T10:00:00Z",
    );
    const keys = await listKeys(kv);
    expect(keys).toEqual([keyFor(endpointA)]);
    expect(keys[0]).not.toContain("push.example");
  });

  it("skips corrupt or foreign-shaped entries when loading", async () => {
    const kv = fakeKV();
    await createBlobsSubscriptionStore(kv).save(
      settings(endpointA, 5),
      "2026-09-18T10:00:00Z",
    );
    await kv.set(keyFor("https://push.example/subscriptions/broken"), "{not json");
    await kv.set(
      keyFor("https://push.example/subscriptions/foreign"),
      JSON.stringify({ nonsense: true }),
    );
    const all = await createBlobsSubscriptionStore(kv).loadAll();
    expect(all).toHaveLength(1);
    expect(all[0].settings.subscription.endpoint).toBe(endpointA);
  });

  it("removes the stored entry", async () => {
    const kv = fakeKV();
    const store = createBlobsSubscriptionStore(kv);
    await store.save(settings(endpointA, 5), "2026-09-18T10:00:00Z");
    await store.remove(endpointA);
    expect(await store.loadAll()).toEqual([]);
  });
});

/** Lists the raw keys currently in the fake KV store. */
async function listKeys(kv: BlobsKV): Promise<string[]> {
  const { blobs } = await kv.list();
  return blobs.map((blob) => blob.key);
}
