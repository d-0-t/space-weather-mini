/**
 * The sender's storage seam (ticket 02): exactly three methods – save,
 * load-all, remove – keyed by the subscription endpoint, so a future move
 * from Netlify Blobs to Postgres touches nothing else (spec maintainer
 * story 23). Overwrites are blind; a re-save keeps the record's dedupe
 * state so a settings change never re-pokes an already-seen event.
 */

import { createHash } from "node:crypto";

import { parseSubscriptionSettings, type SubscriptionSettings } from "./subscription-settings";

/** One stored chaser: settings plus the sender's bookkeeping. */
export interface StoredSubscription {
  settings: SubscriptionSettings;
  /** Event keys (product_id|issue_datetime family) already poked. */
  seenKeys: string[];
  /** ISO instant of the last save – every settings change overwrites it. */
  savedAt: string;
}

/** The 3-method seam every storage backend implements. */
export interface SubscriptionStore {
  /** Stores (or blindly overwrites) the settings for its endpoint. */
  save(settings: SubscriptionSettings, savedAt: string): Promise<void>;
  /** Every stored subscription in a deterministic order. */
  loadAll(): Promise<StoredSubscription[]>;
  /** Forgets the subscription entirely (the disable path). */
  remove(endpoint: string): Promise<void>;
}

/**
 * The in-memory backend: tests and local runs. `records` is the declared
 * test affordance for ticket 03-05 scenario seeding (the dedupe keys only
 * enter through the sender's bookkeeping); production code touches the
 * 3-method seam only. Nothing persists: the sender forgets every chaser on
 * restart, which is honest for a store that never claimed durability.
 */
export interface MemorySubscriptionStore extends SubscriptionStore {
  /** The keyed records, for test seeding only. */
  records: Map<string, StoredSubscription>;
}

export function createMemorySubscriptionStore(): MemorySubscriptionStore {
  const records = new Map<string, StoredSubscription>();
  return {
    records,
    async save(settings, savedAt) {
      const endpoint = settings.subscription.endpoint;
      const existing = records.get(endpoint);
      records.set(endpoint, {
        settings,
        seenKeys: existing?.seenKeys ?? [],
        savedAt,
      });
    },
    async loadAll() {
      return [...records.values()].sort((a, b) =>
        a.settings.subscription.endpoint.localeCompare(
          b.settings.subscription.endpoint,
        ),
      );
    },
    async remove(endpoint) {
      records.delete(endpoint);
    },
  };
}

/**
 * The minimal KV surface the Blobs backend needs – Netlify Blobs' store
 * objects satisfy it, and tests substitute an in-memory fake.
 */
export interface BlobsKV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<{ blobs: { key: string }[] }>;
}

/** The endpoint's stable storage key: its SHA-256 hex digest. */
const keyFor = (endpoint: string): string =>
  createHash("sha256").update(endpoint).digest("hex");

/**
 * The Netlify Blobs backend (the built-in key-value store). Each endpoint
 * is keyed by its digest so the push address never lands raw in a key;
 * corrupt or foreign-shaped entries are skipped, never thrown.
 */
export function createBlobsSubscriptionStore(kv: BlobsKV): SubscriptionStore {
  return {
    async save(settings, savedAt) {
      const existingRaw = await kv.get(keyFor(settings.subscription.endpoint));
      const existing =
        existingRaw !== null ? safeParseRecord(existingRaw) : null;
      await kv.set(
        keyFor(settings.subscription.endpoint),
        JSON.stringify({
          settings,
          seenKeys: existing?.seenKeys ?? [],
          savedAt,
        }),
      );
    },
    async loadAll() {
      const { blobs } = await kv.list();
      const records: StoredSubscription[] = [];
      for (const { key } of blobs) {
        const raw = await kv.get(key);
        const parsed = raw !== null ? safeParseRecord(raw) : null;
        if (parsed) records.push(parsed);
      }
      return records.sort((a, b) =>
        a.settings.subscription.endpoint.localeCompare(
          b.settings.subscription.endpoint,
        ),
      );
    },
    async remove(endpoint) {
      await kv.delete(keyFor(endpoint));
    },
  };
}

/** Parses a stored record, or null when it is corrupt or foreign-shaped. */
function safeParseRecord(raw: string): StoredSubscription | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).settings !== "object" ||
      (parsed as Record<string, unknown>).settings === null
    ) {
      return null;
    }
    const settings = parseSubscriptionSettings(
      (parsed as Record<string, unknown>).settings,
    );
    if (!settings) return null;
    const { seenKeys, savedAt } = parsed as Record<string, unknown>;
    if (!Array.isArray(seenKeys) || typeof savedAt !== "string") return null;
    return {
      settings,
      seenKeys: seenKeys.filter((key): key is string => typeof key === "string"),
      savedAt,
    };
  } catch {
    return null;
  }
}
