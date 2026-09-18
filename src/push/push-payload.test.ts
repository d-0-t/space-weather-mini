import { describe, expect, it } from "vitest";

import {
  PUSH_TTL_SECONDS,
  buildPushPayload,
  isGoneStatus,
  notificationOptionsFromPayload,
  parsePushPayloadJson,
} from "./push-payload";

describe("push payload (ticket 02)", () => {
  it("carries a day-scale time-to-live for daily and forecast pokes", () => {
    expect(PUSH_TTL_SECONDS.daily).toBe(12 * 60 * 60);
    expect(PUSH_TTL_SECONDS.forecast).toBe(12 * 60 * 60);
  });

  it("carries an hour-scale time-to-live for live pokes and the test poke", () => {
    expect(PUSH_TTL_SECONDS.live).toBe(60 * 60);
    expect(PUSH_TTL_SECONDS.test).toBe(60 * 60);
  });

  it("builds a poke with the event key as its collapse tag", () => {
    const payload = buildPushPayload("daily", {
      title: "Tonight Kp 4 expected",
      body: "Darkest at Piteå 22:38–02:23.",
      key: "product|2026-09-18 12:00",
      url: "/",
    });
    expect(payload).toEqual({
      title: "Tonight Kp 4 expected",
      body: "Darkest at Piteå 22:38–02:23.",
      key: "product|2026-09-18 12:00",
      url: "/",
      ttlSeconds: PUSH_TTL_SECONDS.daily,
    });
    expect(payload.key).toBe("product|2026-09-18 12:00");
  });

  it("builds WebKit-honored notification options only", () => {
    const payload = buildPushPayload("live", {
      title: "Active overhead",
      body: "The shared verdict word is favorable.",
      key: "live:word",
      url: "/",
    });
    const { title, options } = notificationOptionsFromPayload(payload);
    expect(title).toBe("Active overhead");
    expect(options.body).toBe("The shared verdict word is favorable.");
    expect(options.tag).toBe("live:word");
    expect(options.data).toEqual({ key: "live:word", url: "/" });
    // WebKit silently ignores actions/image/icon/badge/vibrate/silent; the
    // builder never sets them, so both platforms render the same alert.
    expect(Object.keys(options).sort()).toEqual(["body", "data", "tag"]);
  });

  it("names a gone-response status (dead subscription) as 404 or 410", () => {
    expect(isGoneStatus(404)).toBe(true);
    expect(isGoneStatus(410)).toBe(true);
    expect(isGoneStatus(400)).toBe(false);
    expect(isGoneStatus(200)).toBe(false);
  });

  it("parses the encrypted payload's JSON back into a poke", () => {
    const payload = buildPushPayload("test", {
      title: "Test alert",
      body: "A poke from the sender.",
      key: "test:1",
      url: "/",
    });
    expect(parsePushPayloadJson(JSON.stringify(payload))).toEqual(payload);
  });

  it("returns null for corrupt or foreign push data so the worker still shows a visible generic notification", () => {
    expect(parsePushPayloadJson("not json")).toBeNull();
    expect(parsePushPayloadJson("[1,2,3]")).toBeNull();
    expect(parsePushPayloadJson(JSON.stringify({ title: "no key" }))).toBeNull();
  });
});
