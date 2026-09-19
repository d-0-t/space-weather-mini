/**
 * The Live alert's event matcher (ticket 05): a background poke when the
 * Summary's shared verdict word turns favorable at the stored geocoded
 * place, with all enabled hindrance gates passing. The word is computed by
 * the app's own grading functions – `overallWord` over the newest observed
 * Kp and the L1 word `l1Word` grades from the same readings the Summary
 * displays, on the same 5-minute-average rule ("Now" = the reading arriving
 * at Earth) – so Summary improvements automatically improve alerts. Speaks
 * verdict words only; Kp numbers stay in the Kp alert's copy and logic.
 *
 * The favorable pivot is `moderate`: the five-word ladder's midpoint
 * (inactive / faint / moderate / strong / intense), where the Summary's
 * own sentences turn from "may stay far north and faint" to "possible now,
 * brighter and moving" – distinct from the Kp alert's chaser-set numeric
 * threshold, and honest about field coupling (the L1 side can lift the word
 * on its own). Both drivers must be present: a missing observed Kp or
 * missing L1 readings leave the word uncomputed, and the live leg stays
 * silent (never a guessed word).
 *
 * Dedupe runs on the sender's stored event keys, keyed
 * `live|{canonical UTC slot}|{word}` where the slot is the observed Kp
 * point's 3-hour slot – the same product|slot key family as the Kp alert.
 * A favorable word pokes once, re-pokes when the word escalates a rung,
 * stays silent when the word eases back, and the next slot's carry of the
 * same word is a silent chain marker; when slots were skipped (a dipped
 * word or a feed outage) the returning word pokes again – the same
 * escalation rules the Kp alert runs on its own slot-step keys.
 * Hindrance-gated moments are withheld without recording, so a sky that
 * clears later in the same word still pokes once. The live kind's ~1h
 * time-to-live keeps a reconnecting phone from flooding with stale pokes.
 */

import {
  l1IntervalText,
  l1Word,
  overallWord,
  OVERALL_WORDS,
  type OverallWord,
} from "../products/interval-texts";
import {
  averagedValueAt,
  addMinutes,
  transitMinutes,
} from "../products/l1-readings";
import type {
  RtswWindPoint,
  RtswMagFieldPoint,
} from "../products/solar-wind";
import type { PlanetaryKPoint } from "../products/noaa-planetary-k-index";
import { parseTimeTag } from "../products/display-time";
import {
  newestObservedPoint,
  slotString,
  SLOT_MS,
} from "./kp-events";
import type {
  DarknessBand,
  HindranceGates,
  PushPlace,
} from "./subscription-settings";
import { solarElevationDegrees } from "../data/sun";

/** The product id of the Live alert's key family. */
export const LIVE_PRODUCT = "live";

/** The word at or above which the Live alert fires: the ladder's midpoint. */
export const LIVE_FAVORABLE_WORD: OverallWord = "moderate";

/** The dedupe key for one Live event: live|slot|word. */
export function liveEventKey(slot: string, word: OverallWord): string {
  return `${LIVE_PRODUCT}|${slot}|${word}`;
}

/** The rank of a word on the five-word ladder. */
const rankOf = (word: OverallWord): number => OVERALL_WORDS.indexOf(word);

/**
 * True when the shared word is at or above the favorable pivot – the one
 * favorable rule, shared by the matcher and the fan-out's weather-gating.
 */
export function isFavorableWord(word: OverallWord): boolean {
  return rankOf(word) >= rankOf(LIVE_FAVORABLE_WORD);
}

/**
 * The highest poked-or-evaluated word rank per canonical slot among the
 * stored keys. Keys of other products (and malformed entries) are ignored.
 */
const ranksBySlot = (seenKeys: string[]): Map<string, number> => {
  const ranks = new Map<string, number>();
  for (const key of seenKeys) {
    if (!key.startsWith(`${LIVE_PRODUCT}|`)) continue;
    const match = key.slice(LIVE_PRODUCT.length + 1).match(/^(.+)\|([a-z-]+)$/);
    if (!match) continue;
    const rank = OVERALL_WORDS.indexOf(match[2] as OverallWord);
    if (rank < 0) continue;
    const current = ranks.get(match[1]);
    if (current === undefined || rank > current) ranks.set(match[1], rank);
  }
  return ranks;
};

/**
 * One evaluated slot-word, or null when the event is not new: an already
 * evaluated slot at an equal-or-higher rank is a repeat (or a downward
 * move – never poked), an escalation pokes, a contiguous slot carrying the
 * same word is a silent chain marker, and skipped slots (a below-favorable
 * dip or a feed gap) let the returning word poke again – the same
 * escalation rules the Kp alert runs on its own slot-step keys.
 */
const evaluateSlot = (input: {
  slotMs: number;
  slot: string;
  word: OverallWord;
  rank: number;
  ranks: Map<string, number>;
  place: PushPlace;
  now: number;
}): LiveEvent | null => {
  const { slotMs, slot, word, rank, ranks, place, now } = input;
  const seenRank = ranks.get(slot);
  if (seenRank !== undefined && seenRank >= rank) return null;
  let lastSlotMs = -Infinity;
  let lastRank = -1;
  for (const [keySlot, keyRank] of ranks) {
    const ms = parseTimeTag(keySlot);
    if (Number.isFinite(ms) && ms > lastSlotMs) {
      lastSlotMs = ms;
      lastRank = keyRank;
    }
  }
  let poke: boolean;
  if (slotMs <= lastSlotMs) {
    poke = rank > lastRank;
  } else {
    const contiguous = slotMs - lastSlotMs === SLOT_MS;
    poke = rank > lastRank || (!contiguous && lastSlotMs + SLOT_MS <= now);
  }
  return {
    key: liveEventKey(slot, word),
    poke,
    title: `Aurora looks ${word} at ${place.shortName}`,
    body: `The shared verdict word turned ${word}; the sky at ${place.shortName} passes your gates.`,
  };
};

/**
 * The weather the gates judge at the stored place, from the same Open-Meteo
 * contract the Local conditions weather card maps. `precipitationMm` is
 * null when the feed carried no reading (an unknown sky withholds rather
 * than guesses).
 */
export interface LiveWeather {
  cloudCoverPercent: number;
  precipitationMm: number | null;
}

/** One evaluated Live alert event. The matcher yields at most one. */
export interface LiveEvent {
  key: string;
  poke: boolean;
  title: string;
  body: string;
}

/**
 * True when the instant's darkness at the place is at or darker than the
 * chosen band. The thresholds are the Local conditions luminosity bands'
 * own degrees – civil 0 to −6°, nautical −6 to −12, astronomical −12 to
 * −18, Night below −18 – so each chosen band's shallow edge is the pass
 * line ("at or darker than"): Nautical passes at −6° and below,
 * Astronomical at −12° and below, Night at −18° and below. Any passes at
 * every elevation, including daytime. Pure over the solar elevation from
 * src/data/sun.ts – the same solar model the darkest-window computation
 * cuts its windows from, so no forked copy drifts.
 */
export function darknessPasses(
  band: DarknessBand,
  elevationDegrees: number,
): boolean {
  switch (band) {
    case "night":
      return elevationDegrees <= -18;
    case "astronomical":
      return elevationDegrees <= -12;
    case "nautical":
      return elevationDegrees <= -6;
    case "any":
      return true;
  }
}

/**
 * The shared verdict word for one poll: the newest observed Kp and the L1
 * readings averaged around the instant arriving at Earth now (the Summary's
 * default selector rule), graded through the app's own functions. The
 * freshest-row guard mirrors the Summary's: the last row must carry its own
 * reading (a trailing null row shows no word there, so the sender stays
 * silent too), the density reading must be present like the merged L1
 * sentence's, and null anchors read as missing data. Returns null when
 * either driver is missing – never a guessed word.
 */
export function sharedVerdictWord(input: {
  observed: PlanetaryKPoint[];
  wind: RtswWindPoint[];
  mag: RtswMagFieldPoint[];
}): OverallWord | null {
  const { observed, wind, mag } = input;
  const observedPoint = newestObservedPoint(observed);
  const latestWind = wind.length > 0 ? wind[wind.length - 1] : null;
  const latestMag = mag.length > 0 ? mag[mag.length - 1] : null;
  if (
    !observedPoint ||
    !latestWind ||
    !latestMag ||
    latestWind.speed === null ||
    latestMag.bz_gsm === null
  ) {
    return null;
  }
  // The "Now" anchor: the reading arriving at Earth now sits `transit`
  // minutes behind the freshest measurement (the Summary's offset-0 rule).
  const transit = transitMinutes(latestWind.speed);
  const anchor = addMinutes(latestWind.time_tag, -transit);
  const speed = averagedValueAt(
    wind.map((row) => ({ time_tag: row.time_tag, value: row.speed })),
    anchor,
  ).value;
  const density = averagedValueAt(
    wind.map((row) => ({ time_tag: row.time_tag, value: row.density })),
    anchor,
  ).value;
  const bz = averagedValueAt(
    mag.map((row) => ({ time_tag: row.time_tag, value: row.bz_gsm })),
    addMinutes(latestMag.time_tag, -transit),
  ).value;
  if (speed === null || bz === null || density === null) return null;
  // The merged L1 sentence's own missing-data rule: the word only grades
  // with all three L1 readings present (the density never lifts the word,
  // but the Summary shows no word without it).
  if (l1IntervalText(speed, bz, density).level === "no-data") return null;
  return overallWord(observedPoint.Kp, l1Word(speed, bz));
}

/**
 * The poke-worthy Live alert events of one poll, over the shared verdict
 * word and the chaser's stored settings: at most one event, only when the
 * word is favorable and every enabled gate passes. Silence is an empty
 * list – no "nothing to see" pokes, and gate-blocked moments record
 * nothing, so a sky that clears later still gets its one poke.
 */
export function matchLiveEvents(input: {
  observed: PlanetaryKPoint[];
  wind: RtswWindPoint[];
  mag: RtswMagFieldPoint[];
  place: PushPlace;
  gates: HindranceGates;
  weather: LiveWeather | null;
  seenKeys: string[];
  now: number;
}): LiveEvent[] {
  const { observed, wind, mag, place, gates, weather, seenKeys, now } = input;
  const word = sharedVerdictWord({ observed, wind, mag });
  if (!word || !isFavorableWord(word)) return [];
  if (!weather) return [];
  const elevation = solarElevationDegrees(
    place.latitude,
    place.longitude,
    new Date(now),
  );
  if (!gatesPass(gates, weather, elevation)) return [];
  const observedPoint = newestObservedPoint(observed);
  if (!observedPoint) return [];
  const slotMs = parseTimeTag(observedPoint.time_tag);
  if (!Number.isFinite(slotMs)) return [];
  const event = evaluateSlot({
    slotMs,
    slot: slotString(slotMs),
    word,
    rank: rankOf(word),
    ranks: ranksBySlot(seenKeys),
    place,
    now,
  });
  return event ? [event] : [];
}

/** Every enabled gate passes; unknown readings withhold. */
function gatesPass(
  gates: HindranceGates,
  weather: LiveWeather,
  elevationDegrees: number,
): boolean {
  if (weather.cloudCoverPercent >= gates.cloudMaxPercent) {
    return false;
  }
  if (gates.noPrecipitation) {
    // An unknown precipitation reading cannot verify "no precipitation",
    // so it withholds – never a guessed sky.
    if (weather.precipitationMm === null) return false;
    if (weather.precipitationMm > 0) return false;
  }
  return darknessPasses(gates.darknessBand, elevationDegrees);
}
