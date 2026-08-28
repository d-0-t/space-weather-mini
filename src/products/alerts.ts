/** Alerts, watches and warnings feed – `products/alerts.json` (ticket 02). */

import { toEpoch } from "./live-helpers";
import { gScaleForKp } from "./thresholds";
import type { PlanetaryKForecastPoint } from "./noaa-planetary-k-index";

export interface SwpcAlert {
  /** NOAA product code, e.g. "K05W" (Kp 5 warning) or "A30F" (A-index 30 watch). */
  product_id: string;
  /** Issue time as sent by SWPC, e.g. "2026-08-28 15:02:40.837" (UTC). */
  issue_datetime: string;
  /** Full NOAA message text (CRLF line breaks preserved). */
  message: string;
  /** Message code from the first line, e.g. "WARK05", "ALTK04", "WATA30". */
  code: string;
  /** Action type derived from the code prefix (ALT/WAR/WAT/SUM). */
  kind: "WATCH" | "WARNING" | "ALERT" | "SUMMARY" | "OTHER";
  /** Geomagnetic K-index from the code (ALTK/WARK only), otherwise null. */
  kp: number | null;
  /** Highest NOAA G scale (1–5) mentioned in the message, if any. */
  gScale: number | null;
}

export const ALERTS_URL =
  "https://services.swpc.noaa.gov/products/alerts.json";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const KIND_BY_CODE_PREFIX: Record<string, SwpcAlert["kind"]> = {
  ALT: "ALERT",
  WAR: "WARNING",
  WAT: "WATCH",
  SUM: "SUMMARY",
};

function messageCode(message: string): string {
  const firstLine = message.split(/\r?\n/)[0] ?? "";
  const match = firstLine.match(/Space Weather Message Code:\s*([A-Z0-9]+)/);
  return match?.[1] ?? "";
}

function kindOfCode(code: string): SwpcAlert["kind"] {
  return KIND_BY_CODE_PREFIX[code.slice(0, 3)] ?? "OTHER";
}

function kpOfCode(code: string): number | null {
  const match = code.match(/^(?:ALT|WAR)K(\d{2})$/);
  return match ? Number(match[1]) : null;
}

function gScaleOfMessage(message: string): number | null {
  let max: number | null = null;
  for (const match of message.matchAll(/\bG([1-5])\b/g)) {
    const scale = Number(match[1]);
    if (max === null || scale > max) max = scale;
  }
  return max;
}

/**
 * Parses the alerts/watches/warnings JSON string into typed alerts.
 * Throws a format-changed error if the JSON shape is unexpected.
 */
export function parseAlerts(text: string): SwpcAlert[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      "parseAlerts: invalid JSON – the NOAA format may have changed",
    );
  }
  if (!Array.isArray(parsed)) {
    throw new Error(
      "parseAlerts: root is not an array – the NOAA format may have changed",
    );
  }
  return parsed.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(
        `parseAlerts: item ${index} is not an object – the NOAA format may have changed`,
      );
    }
    const { product_id, issue_datetime, message } = item as Record<
      string,
      unknown
    >;
    if (
      typeof product_id !== "string" ||
      typeof issue_datetime !== "string" ||
      typeof message !== "string"
    ) {
      throw new Error(
        `parseAlerts: item ${index} missing required fields – the NOAA format may have changed`,
      );
    }
    const code = messageCode(message);
    return {
      product_id,
      issue_datetime,
      message,
      code,
      kind: kindOfCode(code),
      kp: kpOfCode(code),
      gScale: gScaleOfMessage(message),
    };
  });
}

/**
 * Dedup key for an alert, stable across polls: `${product_id}|${issue_datetime}`.
 */
export function alertKey(alert: SwpcAlert): string {
  return `${alert.product_id}|${alert.issue_datetime}`;
}

/**
 * True when an alert is an actionable WATCH/WARNING/ALERT for geomagnetic
 * activity at or above the chaser's Kp threshold: the K-index from the code
 * (ALTK/WARK) or the G scale mentioned in the message. The message G check
 * alone misses K-index alerts below G1 (e.g. ALTK04 carries no G line), so
 * the code-derived K-index is the primary test.
 */
export function alertMatchesThreshold(
  alert: SwpcAlert,
  kpThreshold: number,
): boolean {
  if (alert.kind !== "WATCH" && alert.kind !== "WARNING" && alert.kind !== "ALERT") {
    return false;
  }
  const gThreshold = gScaleForKp(kpThreshold);
  return (
    (alert.kp !== null && alert.kp >= kpThreshold) ||
    (alert.gScale !== null && alert.gScale >= gThreshold)
  );
}

/**
 * Matching alerts, newest first, deduped by product_id|issue_datetime.
 */
export function matchingAlerts(
  alerts: SwpcAlert[],
  kpThreshold: number,
): SwpcAlert[] {
  const seen = new Set<string>();
  const matches: SwpcAlert[] = [];
  for (const alert of alerts) {
    if (!alertMatchesThreshold(alert, kpThreshold)) continue;
    const key = alertKey(alert);
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push(alert);
  }
  matches.sort((a, b) => b.issue_datetime.localeCompare(a.issue_datetime));
  return matches;
}

/** The actionable line of the message ("WARNING: Geomagnetic K-index of 5 expected"). */
export function alertSnippet(alert: SwpcAlert): string {
  const line = alert.message.match(
    /^(?:WATCH|WARNING|ALERT|EXTENDED WARNING|SUMMARY)[^\r\n]*/m,
  );
  return (line?.[0] ?? "").trim();
}

/** Short title for the in-app banner and system notifications. */
export function alertTitle(alert: SwpcAlert): string {
  return alertSnippet(alert).replace(
    /^(?:WATCH|WARNING|ALERT|EXTENDED WARNING|SUMMARY):\s*/,
    "",
  );
}

/**
 * The issue time of the newest alert in the feed, or null when the feed is
 * empty. Used for the stale-cache age ("showing X-old cache").
 */
export function newestAlertTime(alerts: SwpcAlert[]): string | null {
  let newest: string | null = null;
  let newestEpoch = -Infinity;
  for (const alert of alerts) {
    const epoch = toEpoch(alert.issue_datetime);
    if (epoch > newestEpoch) {
      newestEpoch = epoch;
      newest = alert.issue_datetime;
    }
  }
  return newest;
}

/**
 * The strongest forecast point inside the next 24 hours whose Kp meets the
 * threshold, or null when nothing breaches. The window is (now, now + 24h].
 */
export function forecastBreachInNext24h(
  points: PlanetaryKForecastPoint[],
  kpThreshold: number,
  now: number,
): { time_tag: string; kp: number } | null {
  const windowEnd = now + 24 * 60 * 60 * 1000;
  let breach: { time_tag: string; kp: number } | null = null;
  for (const point of points) {
    const time = toEpoch(point.time_tag);
    if (Number.isNaN(time) || time <= now || time > windowEnd) continue;
    if (point.kp < kpThreshold) continue;
    if (breach === null || point.kp > breach.kp) {
      breach = { time_tag: point.time_tag, kp: point.kp };
    }
  }
  return breach;
}

const SEEN_ALERTS_KEY = "sw:alerts:seen:v1";

/** Seen-alert keys ("product_id|issue_datetime") from storage, newest last. */
export function loadSeenAlertKeys(
  storage: Pick<Storage, "getItem">,
): string[] {
  try {
    const raw = storage.getItem(SEEN_ALERTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((key): key is string => typeof key === "string");
  } catch {
    return [];
  }
}

/** Persists the seen-alert keys, keeping only the 200 most recent. */
export function saveSeenAlertKeys(
  storage: Pick<Storage, "setItem">,
  keys: string[],
): void {
  const deduped = [...new Set(keys)].slice(-200);
  storage.setItem(SEEN_ALERTS_KEY, JSON.stringify(deduped));
}