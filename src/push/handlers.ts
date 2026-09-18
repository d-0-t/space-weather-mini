/**
 * The sender's endpoint and poll logic (ticket 02), written as pure-ish
 * functions over injected dependencies so the Netlify function files stay
 * thin adapters and the contracts are testable without the platform:
 * subscribe-overwrite, disable-forget, the manual test poke with
 * gone-subscription pruning, and the scheduled NOAA poll skeleton whose
 * matching/dedupe lands in tickets 03-05.
 */

import {
  parseSubscriptionSettings,
  type SubscriptionSettings,
} from "./subscription-settings";
import type { StoredSubscription, SubscriptionStore } from "./subscription-store";
import {
  buildPushPayload,
  isGoneStatus,
  type PushPayload,
} from "./push-payload";

/** What the endpoints answer with: just the HTTP status. */
export interface HandlerResponse {
  status: number;
}

/** The push send call boundary – web-push in the functions, a fake in tests. */
export type PushSend = (
  record: StoredSubscription,
  payload: PushPayload,
) => Promise<{ status: number }>;

/** Stores (or blindly overwrites) the chaser's full settings object. */
export async function handleSubscribe(
  body: unknown,
  deps: { store: SubscriptionStore; now: number },
): Promise<HandlerResponse> {
  const settings: SubscriptionSettings | null =
    parseSubscriptionSettings(body);
  if (!settings) return { status: 400 };
  await deps.store.save(settings, new Date(deps.now).toISOString());
  return { status: 200 };
}

/** Forgets the chaser entirely: the disable path. */
export async function handleUnsubscribe(
  endpoint: string,
  deps: { store: SubscriptionStore },
): Promise<HandlerResponse> {
  if (!endpoint) return { status: 400 };
  await deps.store.remove(endpoint);
  return { status: 200 };
}

/** Fires one canned poke end to end – the manual real-phone check. */
export async function handleSendTest(
  endpoint: string,
  deps: { store: SubscriptionStore; send: PushSend },
): Promise<HandlerResponse> {
  const all = await deps.store.loadAll();
  const record = all.find(
    (candidate) => candidate.settings.subscription.endpoint === endpoint,
  );
  if (!record) return { status: 404 };
  const payload = buildPushPayload("test", {
    title: "Test alert",
    body: "A background-alert poke from the Space Weather sender.",
    key: `test:${new Date().toISOString()}`,
    url: "/",
  });
  const result = await deps.send(record, payload);
  if (isGoneStatus(result.status)) {
    await deps.store.remove(endpoint);
    return { status: 410 };
  }
  return { status: 200 };
}

/** The parsed counts of the three NOAA legs the poll reads. */
export interface PollFeeds {
  alerts: number;
  forecast: number;
  scales: number;
}

/** The poll's summary, logged per run. */
export interface PollSummary {
  subscriptions: number;
  feeds: PollFeeds;
  /** Matching/dedupe land in tickets 03-05; the skeleton sends nothing. */
  sent: number;
}

/**
 * The scheduled poll skeleton: loads every stored subscription and polls
 * the three NOAA feeds the app already reads. The matching, dedupe and
 * fan-out per alert type arrive in tickets 03-05; until then the poll
 * touches nothing but the feeds.
 */
export async function runPoll(deps: {
  store: SubscriptionStore;
  send: PushSend;
  fetchFeeds: () => Promise<PollFeeds>;
}): Promise<PollSummary> {
  const feeds = await deps.fetchFeeds();
  const subscriptions = await deps.store.loadAll();
  return { subscriptions: subscriptions.length, feeds, sent: 0 };
}
