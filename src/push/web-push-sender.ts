/**
 * The sender's push-send implementation (ticket 02): the one place web-push
 * is touched. Automated tests stop here – this boundary is the last line
 * the unit suite pins; delivery itself is verified manually on real
 * devices (emulators cannot do push, spec testing decision).
 */

import webpush from "web-push";

import type { StoredSubscription } from "./subscription-store";
import type { PushSend } from "./handlers";
import type { PushSubscriptionJSON } from "./subscription-settings";

/** The VAPID identity the sender signs every push with. */
export interface VapidCredentials {
  /** The contact URI (mailto:) the push services require. */
  subject: string;
  /** The ECDSA P-256 public key the browsers subscribed to. */
  publicKey: string;
  /** The private key – an env var, never committed. */
  privateKey: string;
}

/** The subscription shape web-push.sendNotification expects. */
const subscriptionForWebPush = (json: PushSubscriptionJSON) => ({
  endpoint: json.endpoint,
  keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
});

/**
 * The PushSend boundary: encrypts the payload into the subscription and
 * posts it to the push service, surfacing the service's HTTP status so the
 * caller can prune gone subscriptions (404/410). Urgency is high because
 * every poke is time-critical: normal-urgency pushes may sit deferred on a
 * dozing phone, which is exactly when an aurora chaser needs the poke.
 */
export function createWebPushSender(vapid: VapidCredentials): PushSend {
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  return async (record, payload) => {
    try {
      await webpush.sendNotification(
        subscriptionForWebPush(record.settings.subscription),
        JSON.stringify(payload),
        { TTL: payload.ttlSeconds, urgency: "high" },
      );
      return { status: 201 };
    } catch (error: unknown) {
      const statusCode =
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof (error as { statusCode: unknown }).statusCode === "number"
          ? (error as { statusCode: number }).statusCode
          : null;
      return { status: statusCode ?? 500 };
    }
  };
}
