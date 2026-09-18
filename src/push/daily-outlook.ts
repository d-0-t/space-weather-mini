/**
 * The Daily outlook alert's event matcher (ticket 04): one place-local
 * morning–lunch push per day naming tonight's expected Kp and the darkest
 * window at the stored geocoded place (e.g. "Tonight Kp 5.33 expected.
 * Darkest at Luleå 22:01–02:50."). The Kp number comes from the forecast
 * leg exactly like the Kp alert's Predicted copy – gated on the chaser's
 * own Alert threshold, so a quiet night never pokes – and the darkest
 * window comes from the same darkest-window computation the app's Local
 * conditions weather line uses, so a forked copy never drifts. Kp numbers
 * and verdict words are never mixed; verdict words are the Live alert's.
 *
 * The send window is the place-local morning–lunch (06:00–12:00). The
 * outlook always describes the coming night (today's darkest window, which
 * starts that evening), never the one just past, and stays silent on
 * midnight-sun days, when no dark stretch exists to plan around.
 *
 * Dedupe runs on the sender's stored event keys, one key per place-local
 * day: `daily-outlook|{YYYY-MM-DD}` – a repeat poll inside the send window
 * is silent and a second poke happens only the next place-local day. The
 * key rides as the notification's collapse tag, and the daily kind's
 * day-scale time-to-live (PUSH_TTL_SECONDS.daily) carries the newest
 * outlook to a phone that reconnects after the send, never a flood of
 * stale days.
 */

import { forecastBreachInNext24h } from "../products/alerts";
import {
  dayKeyInZone,
  formatClockInZone,
  hourOfDayInZone,
} from "../products/display-time";
import { darkestWindow, daylightTimes } from "../data/sun";
import type { PlanetaryKForecastPoint } from "../products/noaa-planetary-k-index";
import type { PushPlace } from "./subscription-settings";

/** The dedupe key family of the Daily outlook: daily-outlook|{place-local day}. */
export function dailyOutlookKey(day: string): string {
  return `daily-outlook|${day}`;
}

/** The morning–lunch send window in place-local wall-clock hours. */
const SEND_WINDOW_START_HOUR = 6;
const SEND_WINDOW_END_HOUR = 12;

/** One evaluated Daily outlook event. The matcher yields at most one. */
export interface DailyOutlookEvent {
  key: string;
  poke: boolean;
  title: string;
  body: string;
}

/** The place-local day the outlook keys on, "YYYY-MM-DD". */
const dayString = (now: number, placeTimezone: string): string => {
  const { year, month, day } = dayKeyInZone(new Date(now), placeTimezone);
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
};

/**
 * The poke-worthy Daily outlook events of one poll, over the parsed Kp
 * forecast and the chaser's stored settings: at most one event, and only
 * when the poll sits inside the send window, the place-local day is
 * unseen, and the next-24h forecast breaches the Alert threshold. Silence
 * is returned as an empty list – no "nothing tonight" pokes, and a quiet
 * morning records no key, so a later forecast revision inside the window
 * can still poke.
 */
export function matchDailyOutlook(input: {
  forecast: PlanetaryKForecastPoint[];
  place: PushPlace;
  placeTimezone: string;
  alertThreshold: number;
  seenKeys: string[];
  now: number;
}): DailyOutlookEvent[] {
  const { forecast, place, placeTimezone, alertThreshold, seenKeys, now } =
    input;
  // The stored zone is validated at subscribe time; the place-local clock
  // owns every decision below, whatever the poll runtime's zone is.
  const hour = hourOfDayInZone(new Date(now), placeTimezone);
  if (hour < SEND_WINDOW_START_HOUR || hour >= SEND_WINDOW_END_HOUR) {
    return [];
  }
  const key = dailyOutlookKey(dayString(now, placeTimezone));
  if (seenKeys.includes(key)) return [];
  const breach = forecastBreachInNext24h(forecast, alertThreshold, now);
  if (!breach) return [];
  // The place's own reference day keys the darkest window: the shared
  // daylightTimes buckets by the referenceZone's calendar day, so the
  // outlook describes the coming night at the place even when the poll
  // runtime's UTC day has already rolled over.
  const daylight = daylightTimes(
    place.latitude,
    place.longitude,
    new Date(now),
    placeTimezone,
  );
  const darkest = darkestWindow(daylight);
  if (darkest.kind === "polar-day") return [];
  const body =
    darkest.kind === "all-dark"
      ? `Darkest at ${place.shortName}: all day.`
      : `Darkest at ${place.shortName} ${formatClockInZone(darkest.start, placeTimezone)}–${formatClockInZone(darkest.end, placeTimezone)}.`;
  return [
    {
      key,
      poke: true,
      title: `Tonight Kp ${breach.kp} expected`,
      body,
    },
  ];
}
