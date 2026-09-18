/**
 * The poke payload the sender encrypts into every Web Push message, and the
 * notification options the service worker shows from it. The fields stay
 * inside the set WebKit honors (title, body, tag, data, lang, dir) so Android
 * and iOS render the same alert; time-to-lives follow the spec's catch-up
 * rule – daily/forecast pokes survive a ~12h offline stretch, live pokes die
 * within the hour so a reconnecting phone receives the newest only.
 */

/** The kind of poke: TTL and collapse behaviour follow it. */
export type PushKind = "daily" | "forecast" | "live" | "test";

/** Time-to-live per kind, in seconds (daily/forecast ~12h, live/test ~1h). */
export const PUSH_TTL_SECONDS: Record<PushKind, number> = {
  daily: 12 * 60 * 60,
  forecast: 12 * 60 * 60,
  live: 60 * 60,
  test: 60 * 60,
};

/** One poke, ready to encrypt and send. */
export interface PushPayload {
  title: string;
  body: string;
  /**
   * The dedupe key (product_id|issue_datetime family) – sent as the
   * notification's collapse tag so repeats replace rather than stack.
   */
  key: string;
  /** The route the notification tap opens, e.g. "/". */
  url: string;
  ttlSeconds: number;
}

/** Builds a poke of the given kind; the event key is the collapse tag. */
export function buildPushPayload(
  kind: PushKind,
  poke: { title: string; body: string; key: string; url: string },
): PushPayload {
  return { ...poke, ttlSeconds: PUSH_TTL_SECONDS[kind] };
}

/**
 * The notification options the service worker passes to
 * showNotification: only WebKit-honored fields, with the key and tap URL
 * riding in `data`.
 */
export function notificationOptionsFromPayload(payload: PushPayload): {
  title: string;
  options: {
    body: string;
    tag: string;
    data: { key: string; url: string };
  };
} {
  return {
    title: payload.title,
    options: {
      body: payload.body,
      tag: payload.key,
      data: { key: payload.key, url: payload.url },
    },
  };
}

/** True when a push-service status means the subscription is gone forever. */
export function isGoneStatus(status: number): boolean {
  return status === 404 || status === 410;
}

/**
 * Parses the push event's decrypted text back into a poke, or null when the
 * data is corrupt or foreign-shaped – the worker then shows a visible
 * generic notification instead, because every push must end visible.
 */
export function parsePushPayloadJson(text: string | null | undefined): PushPayload | null {
  if (!text) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }
    const { title, body, key, url, ttlSeconds } = parsed as Record<string, unknown>;
    if (
      typeof title !== "string" ||
      typeof body !== "string" ||
      typeof key !== "string" ||
      typeof url !== "string"
    ) {
      return null;
    }
    return {
      title,
      body,
      key,
      url,
      ttlSeconds: typeof ttlSeconds === "number" ? ttlSeconds : 0,
    };
  } catch {
    return null;
  }
}
