/**
 * The Kp alert's event matcher (ticket 03): reads the observed planetary
 * K-index and the Kp forecast the app already parses and decides which
 * events are worth a poke. Speaks in Kp numbers only – the copy labels each
 * leg honestly (Observed for the official 3-hour value, Predicted for the
 * 24h forecast) and never mentions verdict words or storm scales.
 *
 * Dedupe runs on the sender's stored event keys, the existing
 * product|issue-datetime family, canonicalized to
 * `{product}|{YYYY-MM-DDTHH:MM:SS}|Kp{step}` where `step` is the integer Kp
 * level an escalation moves forward. An event pokes when its step exceeds
 * the last evaluated step of its slot or, when the storm skipped slots
 * (dipped below threshold or the forecast was revised), the previous event
 * has expired. Every newly evaluated slot-step is recorded, so a storm
 * carrying across slots at one level never re-pokes and the in-app strip
 * still updates from the live feeds.
 */

import { parseTimeTag } from "../products/display-time";
import { forecastBreachInNext24h } from "../products/alerts";
import type {
  PlanetaryKPoint,
  PlanetaryKForecastPoint,
} from "../products/noaa-planetary-k-index";

/** Which leg a poke came from: the observed value or the 24h forecast. */
export type KpLeg = "observed" | "predicted";

/** One evaluated Kp event. `poke` is false for silent chain markers. */
export interface KpEvent {
  key: string;
  leg: KpLeg;
  kp: number;
  poke: boolean;
  title: string;
  body: string;
}

/** Product ids of the two Kp legs, used in the dedupe keys. */
export const KP_OBSERVED_PRODUCT = "noaa-planetary-k-index";
export const KP_FORECAST_PRODUCT = "noaa-planetary-k-index-forecast";

/** One NOAA Kp slot in milliseconds – shared with the Live alert's keys,
 * which ride the same slot spine (ticket 05). */
export const SLOT_MS = 3 * 60 * 60 * 1000;
const KP_SCALE_MAX = 9;

/** The canonical UTC slot string, e.g. "2026-09-18T18:00:00". Shared with
 * the Live alert's keys, which ride the same slot spine (ticket 05). */
export const slotString = (slotMs: number): string => {
  const date = new Date(slotMs);
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(
    date.getUTCSeconds(),
  )}`;
};

/** The dedupe key for one Kp event: product|slot|Kp-step. */
export function kpEventKey(
  product: string,
  timeTag: string,
  step: number,
): string {
  return `${product}|${slotString(parseTimeTag(timeTag))}|Kp${step}`;
}

/**
 * The highest poked step per canonical slot among the stored keys of one
 * product. Keys of other products (and malformed entries) are ignored.
 */
const stepsBySlot = (seenKeys: string[], product: string): Map<string, number> => {
  const steps = new Map<string, number>();
  for (const key of seenKeys) {
    if (!key.startsWith(`${product}|`)) continue;
    const match = key.slice(product.length + 1).match(/^(.+)\|Kp(\d+)$/);
    if (!match) continue;
    const step = Number(match[2]);
    const slot = match[1];
    const current = steps.get(slot);
    if (current === undefined || step > current) steps.set(slot, step);
  }
  return steps;
};

/** One evaluated event slot-step, or null when the event is not new. */
const evaluateSlot = (input: {
  product: string;
  leg: KpLeg;
  timeTag: string;
  kp: number;
  alertThreshold: number;
  steps: Map<string, number>;
  now: number;
}): KpEvent | null => {
  const { product, leg, timeTag, kp, alertThreshold, steps, now } = input;
  const slotMs = parseTimeTag(timeTag);
  if (!Number.isFinite(slotMs) || !Number.isFinite(kp)) return null;
  if (kp < alertThreshold) return null;
  const step = Math.min(KP_SCALE_MAX, Math.floor(kp));
  if (steps.get(slotString(slotMs)) !== undefined &&
    steps.get(slotString(slotMs))! >= step
  ) {
    return null;
  }

  const lastSlotMs = [...steps.keys()].reduce((max, key) => {
    const slotMs = parseTimeTag(key);
    return Number.isFinite(slotMs) && slotMs > max ? slotMs : max;
  }, -Infinity);
  const lastStep =
    steps.get(slotString(lastSlotMs)) ?? -1;
  let poke: boolean;
  if (slotMs <= lastSlotMs) {
    poke = step > lastStep;
  } else {
    const contiguous = slotMs - lastSlotMs === SLOT_MS;
    poke =
      step > lastStep || (!contiguous && lastSlotMs + SLOT_MS <= now);
  }

  const label = leg === "observed" ? "Observed" : "Predicted";
  return {
    key: kpEventKey(product, timeTag, step),
    leg,
    kp,
    poke,
    title: `Kp ${kp} ${label}`,
    body:
      leg === "observed"
        ? `The official 3-hour planetary K-index reached ${kp}.`
        : `The Kp forecast expects ${kp} within the next 24 hours.`,
  };
};

/** The newest observed point (the current official 3-hour slot), or null.
 * Shared with the Live alert matcher, whose word rides the same newest
 * observed value the Summary displays (ticket 05). */
export const newestObservedPoint = (
  points: PlanetaryKPoint[],
): PlanetaryKPoint | null => {
  let newest: PlanetaryKPoint | null = null;
  let newestMs = -Infinity;
  for (const point of points) {
    const ms = parseTimeTag(point.time_tag);
    if (Number.isNaN(ms) || ms <= newestMs) continue;
    newestMs = ms;
    newest = point;
  }
  return newest;
};

/**
 * The poke-worthy Kp events of one poll, over the parsed NOAA legs. Each
 * returned event carries an unseen dedupe key; `poke` says whether it is a
 * real poke (breach or escalation) or a silent chain marker the caller
 * records without sending.
 */
export function matchKpEvents(input: {
  observed: PlanetaryKPoint[];
  forecast: PlanetaryKForecastPoint[];
  alertThreshold: number;
  seenKeys: string[];
  now: number;
}): KpEvent[] {
  const { observed, forecast, alertThreshold, seenKeys, now } = input;
  const events: KpEvent[] = [];

  const observedPoint = newestObservedPoint(observed);
  if (observedPoint) {
    const event = evaluateSlot({
      product: KP_OBSERVED_PRODUCT,
      leg: "observed",
      timeTag: observedPoint.time_tag,
      kp: observedPoint.Kp,
      alertThreshold,
      steps: stepsBySlot(seenKeys, KP_OBSERVED_PRODUCT),
      now,
    });
    if (event) events.push(event);
  }

  const breach = forecastBreachInNext24h(forecast, alertThreshold, now);
  if (breach) {
    const event = evaluateSlot({
      product: KP_FORECAST_PRODUCT,
      leg: "predicted",
      timeTag: breach.time_tag,
      kp: breach.kp,
      alertThreshold,
      steps: stepsBySlot(seenKeys, KP_FORECAST_PRODUCT),
      now,
    });
    if (event) events.push(event);
  }

  return events;
}
