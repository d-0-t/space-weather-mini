/**
 * The sender's endpoint and poll logic (ticket 02, fan-out since ticket 03),
 * written as pure-ish functions over injected dependencies so the Netlify
 * function files stay thin adapters and the contracts are testable without
 * the platform: subscribe-overwrite, disable-forget, the manual test poke
 * with gone-subscription pruning, and the scheduled NOAA poll whose Kp
 * matching, dedupe and fan-out run here, alongside the Daily outlook's
 * once-per-place-local-day leg (ticket 04; ticket 05 adds the live alert).
 */

import {
  parseSubscriptionSettings,
  type SubscriptionSettings,
} from "./subscription-settings";
import type { StoredSubscription, SubscriptionStore } from "./subscription-store";
import {
  buildPushPayload,
  isGoneStatus,
  type PushKind,
  type PushPayload,
} from "./push-payload";
import { matchKpEvents } from "./kp-events";
import { matchDailyOutlook } from "./daily-outlook";
import {
  isFavorableWord,
  matchLiveEvents,
  sharedVerdictWord,
  type LiveWeather,
} from "./live-events";
import type {
  PlanetaryKPoint,
  PlanetaryKForecastPoint,
} from "../products/noaa-planetary-k-index";
import type {
  RtswWindPoint,
  RtswMagFieldPoint,
} from "../products/solar-wind";
import type { PushPlace } from "./subscription-settings";

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

/**
 * Fires one canned poke end to end – the manual real-phone check. The
 * optional delay holds the poke so the chaser can close the app first and
 * prove the background path; unknown endpoints still answer 404 fast.
 */
export async function handleSendTest(
  endpoint: string,
  deps: { store: SubscriptionStore; send: PushSend },
  opts?: { delayMs?: number },
): Promise<HandlerResponse> {
  const all = await deps.store.loadAll();
  const record = all.find(
    (candidate) => candidate.settings.subscription.endpoint === endpoint,
  );
  if (!record) return { status: 404 };
  const delayMs = Math.min(Math.max(opts?.delayMs ?? 0, 0), 30_000);
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
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

/** The parsed NOAA legs the poll reads: the two Kp legs (the Kp alert) and
 * the two L1 legs (the Live alert's shared verdict word, ticket 05). */
export interface PollFeeds {
  observed: PlanetaryKPoint[];
  forecast: PlanetaryKForecastPoint[];
  /** The 1-minute real-time solar wind rows (speed + density). */
  wind: RtswWindPoint[];
  /** The 1-minute real-time magnetic field rows (Bt, Bz GSM). */
  mag: RtswMagFieldPoint[];
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
 * NOAA legs (the two Kp legs, and since ticket 05 the two L1 legs), fans
 * out the Kp alert's pokes, the once-per-place-local-day Daily outlook and
 * the Live alert's shared-word pokes, deduped and gated by the chaser's own
 * seen keys and toggles. Feeds are read once and shared; a failed leg
 * throws before the store is touched, so the next poll retries cleanly.
 */
export async function runPoll(deps: {
  store: SubscriptionStore;
  send: PushSend;
  fetchFeeds: () => Promise<PollFeeds>;
  /** The Open-Meteo weather at one chaser's stored place (the Live alert's
   * gates). Read per live-enabled record with a favorable word, only when
   * that leg can fire. */
  fetchWeather: (place: PushPlace) => Promise<LiveWeather>;
  now?: number;
}): Promise<PollSummary> {
  const feeds = await deps.fetchFeeds();
  const now = deps.now ?? Date.now();
  const records = await deps.store.loadAll();
  let sent = 0;
  for (const record of records) {
    const kp = await fanOutKp(record, { ...deps, feeds, now });
    sent += kp.sent;
    if (kp.pruned) continue;
    const daily = await fanOutDaily(record, { ...deps, feeds, now });
    sent += daily.sent;
    const live = await fanOutLive(record, { ...deps, feeds, now });
    sent += live.sent;
  }
  return { subscriptions: records.length, feeds, sent };
}

/**
 * One fan-out leg's outcome: pokes the push service accepted, and whether
 * it reported the subscription gone (404/410) – a pruned record's remaining
 * legs are skipped.
 */
interface LegOutcome {
  sent: number;
  pruned: boolean;
}

/** One poke a matcher produced, ready to send. `poke: false` marks a
 *  silent chain marker the fan-out records without sending. */
interface OutgoingPoke {
  key: string;
  title: string;
  body: string;
  kind: PushKind;
  poke: boolean;
}

/**
 * One record's fan-out over the matched events: send the poke-worthy ones
 * and record every newly evaluated key (poked or silent) through the
 * store. A gone response prunes the record; a transient send failure
 * records nothing so the next poll retries. The record's seenKeys stay
 * current in memory so a following leg composes with this one's
 * bookkeeping.
 */
async function fanOutEvents(
  record: StoredSubscription,
  deps: { store: SubscriptionStore; send: PushSend },
  pokes: OutgoingPoke[],
): Promise<LegOutcome> {
  const seenKeys = [...record.seenKeys];
  let sent = 0;
  for (const poke of pokes) {
    if (!poke.poke) {
      seenKeys.push(poke.key);
      continue;
    }
    const payload = buildPushPayload(poke.kind, {
      title: poke.title,
      body: poke.body,
      key: poke.key,
      url: "/",
    });
    const result = await deps.send(record, payload);
    if (isGoneStatus(result.status)) {
      await deps.store.remove(record.settings.subscription.endpoint);
      return { sent, pruned: true };
    }
    if (result.status >= 200 && result.status < 300) {
      seenKeys.push(poke.key);
      sent += 1;
    } else {
      break;
    }
  }
  if (seenKeys.length > record.seenKeys.length) {
    await deps.store.save(record.settings, record.savedAt, seenKeys);
    record.seenKeys = seenKeys;
  }
  return { sent, pruned: false };
}

/**
 * One record's Kp fan-out: match the chaser's threshold against the parsed
 * legs, mapping each leg to its honest payload kind (Observed → the live
 * kind's hour-scale TTL, Predicted → the forecast kind's day-scale TTL).
 */
async function fanOutKp(
  record: StoredSubscription,
  deps: {
    store: SubscriptionStore;
    send: PushSend;
    feeds: PollFeeds;
    now: number;
  },
): Promise<LegOutcome> {
  if (!record.settings.alertTypes.kp) return { sent: 0, pruned: false };
  const pokes = matchKpEvents({
    observed: deps.feeds.observed,
    forecast: deps.feeds.forecast,
    alertThreshold: record.settings.alertThreshold,
    seenKeys: record.seenKeys,
    now: deps.now,
  }).map((event) => ({
    key: event.key,
    title: event.title,
    body: event.body,
    kind: event.leg === "observed" ? ("live" as const) : ("forecast" as const),
    poke: event.poke,
  }));
  return fanOutEvents(record, deps, pokes);
}

/**
 * One record's Daily outlook fan-out (ticket 04): at most one poke per
 * place-local day, in the morning–lunch window, when tonight's forecast
 * breaches the chaser's own Alert threshold.
 */
async function fanOutDaily(
  record: StoredSubscription,
  deps: {
    store: SubscriptionStore;
    send: PushSend;
    feeds: PollFeeds;
    now: number;
  },
): Promise<LegOutcome> {
  if (!record.settings.alertTypes.daily) return { sent: 0, pruned: false };
  const events = matchDailyOutlook({
    forecast: deps.feeds.forecast,
    place: record.settings.place,
    placeTimezone: record.settings.placeTimezone,
    alertThreshold: record.settings.alertThreshold,
    seenKeys: record.seenKeys,
    now: deps.now,
  }).map((event) => ({ ...event, kind: "daily" as const }));
  return fanOutEvents(record, deps, events);
}

/**
 * One record's Live alert fan-out (ticket 05): the shared verdict word is
 * graded first, so a chaser whose word is not favorable is never weather-
 * fetched; then the Open-Meteo weather at the chaser's own stored place
 * feeds the gates, and the matcher decides against the seen keys. A failed
 * weather fetch withholds the leg quietly – an unknown sky never pokes –
 * and a live-toggled-off chaser is never fetched for at all.
 */
async function fanOutLive(
  record: StoredSubscription,
  deps: {
    store: SubscriptionStore;
    send: PushSend;
    feeds: PollFeeds;
    fetchWeather: (place: PushPlace) => Promise<LiveWeather>;
    now: number;
  },
): Promise<LegOutcome> {
  if (!record.settings.alertTypes.live) return { sent: 0, pruned: false };
  const word = sharedVerdictWord({
    observed: deps.feeds.observed,
    wind: deps.feeds.wind,
    mag: deps.feeds.mag,
  });
  if (!word || !isFavorableWord(word)) return { sent: 0, pruned: false };
  let weather: LiveWeather | null = null;
  try {
    weather = await deps.fetchWeather(record.settings.place);
  } catch {
    weather = null;
  }
  const pokes = matchLiveEvents({
    observed: deps.feeds.observed,
    wind: deps.feeds.wind,
    mag: deps.feeds.mag,
    place: record.settings.place,
    gates: record.settings.gates,
    weather,
    seenKeys: record.seenKeys,
    now: deps.now,
  }).map((event) => ({ ...event, kind: "live" as const }));
  return fanOutEvents(record, deps, pokes);
}
