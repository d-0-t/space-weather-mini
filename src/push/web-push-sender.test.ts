import { describe, expect, it, vi, beforeEach } from "vitest";

/** The sendNotification surface web-push exposes (mocked in this suite). */
type SendNotificationFn = (
  subscription: unknown,
  payload: string,
  options: { TTL: number },
) => Promise<void>;

const sendNotification = vi.fn<SendNotificationFn>(async () => undefined);

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: (...args: Parameters<SendNotificationFn>) =>
      sendNotification(...args),
  },
}));

import { createWebPushSender } from "./web-push-sender";
import { buildPushPayload } from "./push-payload";
import type { StoredSubscription } from "./subscription-store";

const record: StoredSubscription = {
  settings: {
    subscription: {
      endpoint: "https://push.example/subscriptions/a",
      keys: { p256dh: "p256dh-key", auth: "auth-key" },
    },
    alertThreshold: 5,
    place: { latitude: 65.5848, longitude: 22.1546, shortName: "Luleå" },
    placeTimezone: "Europe/Stockholm",
    alertTypes: { daily: true, kp: true, live: true },
    gates: { cloudMaxPercent: 50, noPrecipitation: true, darknessBand: "astronomical" },
  },
  seenKeys: [],
  savedAt: "2026-09-18T10:00:00.000Z",
};

describe("the web-push send boundary (ticket 02)", () => {
  beforeEach(() => {
    sendNotification.mockClear();
  });

  it("sends the encrypted payload with the poke's TTL to the subscription", async () => {
    const send = createWebPushSender({
      subject: "mailto:alerts@example.com",
      publicKey: "vapid-public",
      privateKey: "vapid-private",
    });
    const payload = buildPushPayload("daily", {
      title: "Tonight Kp 4 expected",
      body: "Darkest at Luleå 22:38 to 02:23.",
      key: "daily:2026-09-18",
      url: "/",
    });
    const result = await send(record, payload);
    expect(result.status).toBe(201);
    expect(sendNotification).toHaveBeenCalledTimes(1);
    const [subscription, payloadJson, options] = sendNotification.mock.calls[0];
    expect(subscription).toEqual({
      endpoint: record.settings.subscription.endpoint,
      keys: record.settings.subscription.keys,
    });
    expect(JSON.parse(payloadJson)).toEqual(payload);
    expect(options.TTL).toBe(payload.ttlSeconds);
  });

  it("surfaces the push service's status on a rejected send", async () => {
    sendNotification.mockRejectedValueOnce({ statusCode: 410 });
    const send = createWebPushSender({
      subject: "mailto:alerts@example.com",
      publicKey: "vapid-public",
      privateKey: "vapid-private",
    });
    const payload = buildPushPayload("live", {
      title: "Active overhead",
      body: "",
      key: "live:word",
      url: "/",
    });
    const result = await send(record, payload);
    expect(result.status).toBe(410);
  });

  it("answers 500 for a send failure without a status", async () => {
    sendNotification.mockRejectedValueOnce(new Error("network down"));
    const send = createWebPushSender({
      subject: "mailto:alerts@example.com",
      publicKey: "vapid-public",
      privateKey: "vapid-private",
    });
    const payload = buildPushPayload("test", {
      title: "Test alert",
      body: "",
      key: "test:1",
      url: "/",
    });
    const result = await send(record, payload);
    expect(result.status).toBe(500);
  });
});
