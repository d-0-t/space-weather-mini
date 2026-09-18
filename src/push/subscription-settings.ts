/**
 * The full subscription settings object the app sends to the push sender
 * (ticket 02): the push subscription itself, the Alert threshold, the stored
 * geocoded place (lat/lon + short name – no display name, no GPS tracking),
 * the place timezone, the three alert type toggles and the hindrance gates.
 * No accounts: the subscription endpoint is the identity, and every settings
 * change overwrites the stored object blindly (spec: no-accounts privacy).
 */

/** The three background alert types, toggled independently (CONTEXT.md). */
export interface AlertTypeToggles {
  /** The Daily outlook alert. */
  daily: boolean;
  /** The Kp alert. */
  kp: boolean;
  /** The Live alert. */
  live: boolean;
}

/**
 * Darkness bands of the hindrance gates, darkest first. "any" includes
 * daytime; the copy spells Twilight out (Astronomical Twilight etc.).
 */
export type DarknessBand = "night" | "astronomical" | "nautical" | "any";

/** The chaser's per-hindrance gates at the stored place (ticket 05 UI). */
export interface HindranceGates {
  /** Withhold the Live alert while cloud cover is at or above this percent. */
  cloudMaxPercent: number;
  /** Withhold the Live alert while it precipitates at the place. */
  noPrecipitation: boolean;
  /** The darkness the Live alert requires at or darker than. */
  darknessBand: DarknessBand;
}

/** The Web Push subscription as the browser's JSON shape. */
export interface PushSubscriptionJSON {
  /** The unguessable push address – the chaser's only identity. */
  endpoint: string;
  keys: {
    /** Per-subscription ECDH public key (RFC 8291). */
    p256dh: string;
    /** Per-subscription authentication secret. */
    auth: string;
  };
}

/** The stored place the sender judges hindrance at: no GPS, no names. */
export interface PushPlace {
  latitude: number;
  longitude: number;
  /** The geocoded place's short name, e.g. "Luleå". */
  shortName: string;
}

/** Everything the sender remembers about one chaser. */
export interface SubscriptionSettings {
  subscription: PushSubscriptionJSON;
  /** The chaser's Alert threshold (1–9, default 5). */
  alertThreshold: number;
  place: PushPlace;
  /** IANA timezone of the stored place, e.g. "Europe/Stockholm". */
  placeTimezone: string;
  alertTypes: AlertTypeToggles;
  gates: HindranceGates;
}

/** Every hindrance gate on by default (spec decision). */
export const DEFAULT_GATES: HindranceGates = {
  cloudMaxPercent: 50,
  noPrecipitation: true,
  darknessBand: "astronomical",
};

const DARKNESS_BANDS: readonly DarknessBand[] = [
  "night",
  "astronomical",
  "nautical",
  "any",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

/**
 * True when Intl knows the value as an IANA time zone – a garbage zone
 * would otherwise silently break every place-local computation the sender
 * runs (the poll's daily outlook, future live-alert gates).
 */
const isTimeZone = (value: unknown): value is string => {
  if (!isNonEmptyString(value)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isPlausibleLatitude = (value: unknown): value is number =>
  isFiniteNumber(value) && value >= -90 && value <= 90;

const isPlausibleLongitude = (value: unknown): value is number =>
  isFiniteNumber(value) && value >= -180 && value <= 180;

/** The plausible hindrance-gate cloud limit (0–100 percent). */
const isCloudMaxPercent = (value: unknown): value is number =>
  isFiniteNumber(value) && value >= 0 && value <= 100;

const parseGates = (value: unknown): HindranceGates | null => {
  if (!isRecord(value)) return null;
  const { cloudMaxPercent, noPrecipitation, darknessBand } = value;
  if (!isCloudMaxPercent(cloudMaxPercent)) return null;
  if (typeof noPrecipitation !== "boolean") return null;
  if (
    typeof darknessBand !== "string" ||
    !DARKNESS_BANDS.includes(darknessBand as DarknessBand)
  ) {
    return null;
  }
  return {
    cloudMaxPercent,
    noPrecipitation,
    darknessBand: darknessBand as DarknessBand,
  };
};

const parseSubscription = (value: unknown): PushSubscriptionJSON | null => {
  if (!isRecord(value)) return null;
  const { endpoint, keys } = value;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) {
    return null;
  }
  if (!isRecord(keys)) return null;
  const { p256dh, auth } = keys;
  if (!isNonEmptyString(p256dh) || !isNonEmptyString(auth)) return null;
  return { endpoint, keys: { p256dh, auth } };
};

const parsePlace = (value: unknown): PushPlace | null => {
  if (!isRecord(value)) return null;
  const { latitude, longitude, shortName } = value;
  if (!isPlausibleLatitude(latitude) || !isPlausibleLongitude(longitude)) {
    return null;
  }
  if (!isNonEmptyString(shortName)) return null;
  return { latitude, longitude, shortName };
};

/**
 * Validates an untrusted settings payload into the stored settings object,
 * or null when anything is missing, malformed, or outside its documented
 * range – the sender never stores a half-valid chaser.
 */
export function parseSubscriptionSettings(
  input: unknown,
): SubscriptionSettings | null {
  if (!isRecord(input)) return null;
  const { subscription, alertThreshold, place, placeTimezone, alertTypes, gates } =
    input;
  const parsedSubscription = parseSubscription(subscription);
  if (!parsedSubscription) return null;
  if (
    !isFiniteNumber(alertThreshold) ||
    alertThreshold < 1 ||
    alertThreshold > 9
  ) {
    return null;
  }
  const parsedPlace = parsePlace(place);
  if (!parsedPlace) return null;
  if (!isTimeZone(placeTimezone)) return null;
  if (
    !isRecord(alertTypes) ||
    typeof alertTypes.daily !== "boolean" ||
    typeof alertTypes.kp !== "boolean" ||
    typeof alertTypes.live !== "boolean"
  ) {
    return null;
  }
  const parsedGates = parseGates(gates);
  if (!parsedGates) return null;
  return {
    subscription: parsedSubscription,
    alertThreshold,
    place: parsedPlace,
    placeTimezone,
    alertTypes: {
      daily: alertTypes.daily,
      kp: alertTypes.kp,
      live: alertTypes.live,
    },
    gates: parsedGates,
  };
}
