/**
 * The browser side of the push foundation (ticket 02): after a tap-granted
 * Notification permission, subscribes the service worker with the app's
 * application server key and POSTs the full settings object to the sender;
 * every settings change re-sends (blind overwrite, no accounts), and
 * disable deletes the stored subscription and unsubscribes the browser.
 */

import { loadKpThreshold } from "../products/thresholds";
import {
  loadGeocodedPlace,
} from "../data/place-storage";
import { loadWeather } from "../data/weather-storage";
import {
  DEFAULT_GATES,
  type PushSubscriptionJSON,
  type SubscriptionSettings,
} from "./subscription-settings";

/** The sender's endpoints, served by the Netlify functions beside the SPA. */
export const SUBSCRIBE_URL = "/.netlify/functions/subscribe";
export const UNSUBSCRIBE_URL = "/.netlify/functions/unsubscribe";
export const SEND_TEST_URL = "/.netlify/functions/send-test";

/**
 * The deps the flows run through in the app: the browser's service worker
 * (getRegistration, never .ready – .ready pends forever when no worker is
 * registered, which would hang dev entirely), the global fetch, and the
 * env-held application server key.
 */
export const browserPushDeps = (): PushClientDeps => ({
  getRegistration: async () =>
    (await navigator.serviceWorker?.getRegistration()) ?? null,
  vapidPublicKey: undefined,
  fetch: (input, init) => fetch(input, init),
});

/** The deps the flows run through – fakes in tests, browser globals live. */
export interface PushClientDeps {
  /** The service worker registration the subscription rides on. */
  getRegistration(): Promise<ServiceWorkerRegistration | null>;
  /** The sender's VAPID public key (base64url), from the build env. */
  vapidPublicKey: string | undefined;
  /** The network call the sender receives. */
  fetch(input: string, init?: RequestInit): Promise<Response>;
}

/**
 * The VAPID public key at build time; the sender's identity on the client.
 * Absent until the maintainer sets VITE_VAPID_PUBLIC_KEY – enable then
 * fails honestly instead of subscribing against a wrong key.
 */
const applicationServerKey = (): string | undefined =>
  import.meta.env.VITE_VAPID_PUBLIC_KEY;

/** Decodes a base64url string (the VAPID key) into the bytes subscribe() wants. */
export function urlBase64ToUint8Array(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/** Encodes key bytes as base64url, the JSON shape the sender validates. */
function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** The Web Push subscription as the sender's JSON shape. */
export function subscriptionToPushJSON(subscription: {
  endpoint: string;
  getKey(name: string): ArrayBuffer | null;
}): PushSubscriptionJSON {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: bufferToBase64Url(subscription.getKey("p256dh") ?? new ArrayBuffer(0)),
      auth: bufferToBase64Url(subscription.getKey("auth") ?? new ArrayBuffer(0)),
    },
  };
}

/**
 * Collects the full settings object from app storage: the chaser's Alert
 * threshold, the stored geocoded place, and the place timezone (the stored
 * weather's IANA zone, or the device zone when no weather is saved yet).
 * Toggles and gates ride their defaults until ticket 06 wires the controls.
 */
export function collectSettings(
  subscription: PushSubscriptionJSON,
  storage: Pick<Storage, "getItem">,
): SubscriptionSettings {
  const place = loadGeocodedPlace(storage);
  const savedWeather = loadWeather(storage, place.latitude, place.longitude);
  const placeTimezone =
    savedWeather?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    subscription,
    alertThreshold: loadKpThreshold(storage),
    place: {
      latitude: place.latitude,
      longitude: place.longitude,
      shortName: place.shortName,
    },
    placeTimezone,
    alertTypes: { daily: true, kp: true, live: true },
    gates: DEFAULT_GATES,
  };
}

/** POSTs the full settings object – the sender overwrites blindly. */
async function postSettings(
  subscription: PushSubscriptionJSON,
  storage: Pick<Storage, "getItem">,
  fetchFn: PushClientDeps["fetch"],
): Promise<void> {
  const response = await fetchFn(SUBSCRIBE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(collectSettings(subscription, storage)),
  });
  if (!response.ok) {
    throw new Error(`Storing the subscription failed (${response.status})`);
  }
}

/**
 * The full enable flow (after the tap-granted permission): subscribe the
 * service worker with the app-server key, then store the settings object.
 * Every failure throws so the UI can route the chaser somewhere honest.
 */
export async function enablePush(
  deps: PushClientDeps,
  storage: Pick<Storage, "getItem">,
): Promise<PushSubscriptionJSON> {
  const vapidKey = deps.vapidPublicKey ?? applicationServerKey();
  if (!vapidKey) {
    throw new Error(
      "The application server key is missing: background alerts cannot subscribe.",
    );
  }
  const registration = await deps.getRegistration();
  if (!registration) {
    throw new Error(
      "No service worker is registered – open the installed app and try again.",
    );
  }
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });
  const json = subscriptionToPushJSON(subscription);
  await postSettings(json, storage, deps.fetch);
  return json;
}

/**
 * Re-sends the settings object for the browser's existing subscription –
 * the overwrite-on-every-change path (threshold or place moved). A no-op
 * while nothing is subscribed.
 */
export async function syncPushSettings(
  deps: PushClientDeps,
  storage: Pick<Storage, "getItem">,
): Promise<void> {
  const registration = await deps.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!registration || !subscription) return;
  await postSettings(
    subscriptionToPushJSON(subscription),
    storage,
    deps.fetch,
  );
}

/**
 * The app's every-change re-send path, shared by the threshold setter and
 * the place picker: re-POSTs the settings object so the sender overwrites.
 * A quiet no-op while nothing is subscribed.
 */
export function resendPushSettings(): void {
  void syncPushSettings(browserPushDeps(), localStorage).catch(() => {
    // the sender keeps the last stored settings until the next change
  });
}

/**
 * Fires one canned test poke at the sender (the manual real-phone check).
 * Returns false when the sender cannot poke this chaser right now.
 */
export async function fireTestPoke(
  endpoint: string,
): Promise<boolean> {
  const response = await browserPushDeps().fetch(
    `${SEND_TEST_URL}?endpoint=${encodeURIComponent(endpoint)}`,
    { method: "POST" },
  );
  return response.ok;
}

/**
 * Disable: DELETE the stored subscription (the sender forgets the chaser
 * entirely) and unsubscribe the browser. With no browser subscription left,
 * the caller passes the endpoint(s) it still knows so the sender forgets.
 */
export async function disablePush(
  deps: PushClientDeps,
  knownEndpoints?: string[],
): Promise<void> {
  const endpoints = new Set(knownEndpoints ?? []);
  const registration = await deps.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    endpoints.add(subscription.endpoint);
    await subscription.unsubscribe();
  }
  for (const endpoint of endpoints) {
    const response = await deps.fetch(
      `${UNSUBSCRIBE_URL}?endpoint=${encodeURIComponent(endpoint)}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      throw new Error(`Forgetting the subscription failed (${response.status})`);
    }
  }
}
