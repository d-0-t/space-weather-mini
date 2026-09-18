/**
 * The sender's endpoint and poll logic (ticket 02, fan-out in ticket 03),
 * written as pure-ish functions over injected dependencies so the Netlify
 * function files stay thin adapters and the contracts are testable without
 * the platform: subscribe-overwrite, disable-forget, the manual test poke
 * with gone-subscription pruning, and the scheduled NOAA poll whose Kp
 * matching, dedupe and fan-out run here (tickets 04-05 add the other
 * alert types).
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
import { matchKpEvents } from "./kp-events";
import type {
  PlanetaryKPoint,
  PlanetaryKForecastPoint,
} from "../products/noaa-planetary-k-index";

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

/** The parsed NOAA legs the poll reads for the Kp alert. */
export interface PollFeeds {
  observed: PlanetaryKPoint[];
  forecast: PlanetaryKForecastPoint[];
}

/** The poll's summary, logged per run. */
export interface PollSummary {
  subscriptions: number;
  feeds: PollFeeds;
  /** Pokes the push service accepted (2xx), per the send call boundary. */
  sent: number;
}

/**
 * The scheduled poll: loads every stored subscription, polls the parsed
 * NOAA Kp legs and fans out one poke per breaching event, deduped and
 * escalation-gated by the chaser's own seen keys. Feeds are read once and
 * shared; a failed leg throws before the store is touched, so the next
 * poll retries cleanly.
 */
export async function runPoll(deps: {
  store: SubscriptionStore;
  send: PushSend;
  fetchFeeds: () => Promise<PollFeeds>;
  now?: number;
}): Promise<PollSummary> {
  const feeds = await deps.fetchFeeds();
  const now = deps.now ?? Date.now();
  const records = await deps.store.loadAll();
  let sent = 0;
  for (const record of records) {
    sent += await fanOutKp(record, { ...deps, feeds, now });
  }
  return { subscriptions: records.length, feeds, sent };
}

/**
 * One record's Kp fan-out: match the chaser's threshold against the parsed
 * legs, send the poke-worthy events, and record every newly evaluated key
 * (poked or silent) through the store. A gone response prunes the record;
 * a transient send failure records nothing so the next poll retries.
 */
async function fanOutKp(
  record: StoredSubscription,
  deps: {
    store: SubscriptionStore;
    send: PushSend;
    feeds: PollFeeds;
    now: number;
  },
): Promise<number> {
  if (!record.settings.alertTypes.kp) return 0;
  const events = matchKpEvents({
    observed: deps.feeds.observed,
    forecast: deps.feeds.forecast,
    alertThreshold: record.settings.alertThreshold,
    seenKeys: record.seenKeys,
    now: deps.now,
  });
  const seenKeys = [...record.seenKeys];
  let sent = 0;
  for (const event of events) {
    if (!event.poke) {
      seenKeys.push(event.key);
      continue;
    }
    const payload = buildPushPayload(
      event.leg === "observed" ? "live" : "forecast",
      {
        title: event.title,
        body: event.body,
        key: event.key,
        url: "/",
      },
    );
    const result = await deps.send(record, payload);
    if (isGoneStatus(result.status)) {
      await deps.store.remove(record.settings.subscription.endpoint);
      return sent;
    }
    if (result.status >= 200 && result.status < 300) {
      seenKeys.push(event.key);
      sent += 1;
    } else {
      break;
    }
  }
  if (seenKeys.length > record.seenKeys.length) {
    await deps.store.save(record.settings, record.savedAt, seenKeys);
  }
  return sent;
}
