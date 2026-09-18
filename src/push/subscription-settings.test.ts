import { describe, expect, it } from "vitest";

import {
  DEFAULT_GATES,
  parseSubscriptionSettings,
} from "./subscription-settings";

const validSubscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
  keys: {
    p256dh: "BqrL3vV0pSWdXyvX4tQoLg-abc",
    auth: "x8b1defghi23456789",
  },
};

const validSettings = {
  subscription: validSubscription,
  alertThreshold: 5,
  place: { latitude: 65.5848, longitude: 22.1546, shortName: "Luleå" },
  placeTimezone: "Europe/Stockholm",
  alertTypes: { daily: true, kp: true, live: true },
  gates: { cloudMaxPercent: 50, noPrecipitation: true, darknessBand: "astronomical" },
};

describe("subscription settings (ticket 02)", () => {
  it("accepts a full valid settings object", () => {
    expect(parseSubscriptionSettings(validSettings)).toEqual(validSettings);
  });

  it("rejects non-objects and missing required fields", () => {
    expect(parseSubscriptionSettings(null)).toBeNull();
    expect(parseSubscriptionSettings("nope")).toBeNull();
    const { place, ...withoutPlace } = validSettings;
    expect(parseSubscriptionSettings(withoutPlace)).toBeNull();
    const { alertTypes, ...withoutTypes } = validSettings;
    expect(parseSubscriptionSettings(withoutTypes)).toBeNull();
  });

  it("rejects a non-https subscription endpoint and missing keys", () => {
    expect(
      parseSubscriptionSettings({
        ...validSettings,
        subscription: { ...validSubscription, endpoint: "http://insecure.example" },
      }),
    ).toBeNull();
    expect(
      parseSubscriptionSettings({
        ...validSettings,
        subscription: { endpoint: validSubscription.endpoint, keys: { p256dh: "abc" } },
      }),
    ).toBeNull();
  });

  it("rejects an out-of-range Alert threshold", () => {
    expect(
      parseSubscriptionSettings({ ...validSettings, alertThreshold: 0 }),
    ).toBeNull();
    expect(
      parseSubscriptionSettings({ ...validSettings, alertThreshold: 10 }),
    ).toBeNull();
  });

  it("rejects an implausible place", () => {
    expect(
      parseSubscriptionSettings({
        ...validSettings,
        place: { latitude: 95, longitude: 22.1546, shortName: "Luleå" },
      }),
    ).toBeNull();
    expect(
      parseSubscriptionSettings({
        ...validSettings,
        place: { latitude: 65.5848, longitude: 400, shortName: "Luleå" },
      }),
    ).toBeNull();
    expect(
      parseSubscriptionSettings({
        ...validSettings,
        place: { latitude: 65.5848, longitude: 22.1546, shortName: "" },
      }),
    ).toBeNull();
  });

  it("rejects an empty place timezone", () => {
    expect(
      parseSubscriptionSettings({ ...validSettings, placeTimezone: "" }),
    ).toBeNull();
  });

  it("rejects malformed alert type toggles", () => {
    expect(
      parseSubscriptionSettings({
        ...validSettings,
        alertTypes: { daily: true, kp: "yes", live: true },
      }),
    ).toBeNull();
  });

  it("rejects gates outside their documented ranges", () => {
    expect(
      parseSubscriptionSettings({
        ...validSettings,
        gates: { ...validSettings.gates, cloudMaxPercent: 101 },
      }),
    ).toBeNull();
    expect(
      parseSubscriptionSettings({
        ...validSettings,
        gates: { ...validSettings.gates, darknessBand: "dusk" },
      }),
    ).toBeNull();
  });

  it("defaults every hindrance gate on, under 50% cloud, Astronomical Twilight", () => {
    expect(DEFAULT_GATES).toEqual({
      cloudMaxPercent: 50,
      noPrecipitation: true,
      darknessBand: "astronomical",
    });
  });
});
