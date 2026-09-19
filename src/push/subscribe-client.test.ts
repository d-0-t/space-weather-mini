import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SUBSCRIBE_URL,
  UNSUBSCRIBE_URL,
  collectSettings,
  disablePush,
  enablePush,
  subscriptionToPushJSON,
  urlBase64ToUint8Array,
  type PushClientDeps,
} from "./subscribe-client";
import { DEFAULT_GATES } from "./subscription-settings";
import { ALERT_SETTINGS_STORAGE_KEY } from "./alert-settings";
import { KP_THRESHOLD_STORAGE_KEY, DEFAULT_KP_THRESHOLD } from "../products/thresholds";
import { PLACE_STORAGE_KEY } from "../data/place-storage";
import { WEATHER_STORAGE_KEY } from "../data/weather-storage";

describe("base64url helpers (ticket 02)", () => {
  // The two URL-safe characters, built from char codes so the vector cannot
  // be misread: a hyphen and an underscore. Base64 of [251, 255, 190] is
  // "+/++"; base64url swaps +/ for those two and strips the padding.
  const hyphen = String.fromCharCode(0x2d);
  const underscore = String.fromCharCode(0x5f);
  const vector = `${hyphen}${underscore}${hyphen}${hyphen}`;

  it("decodes the VAPID application server key into the bytes subscribe() wants", () => {
    const bytes = urlBase64ToUint8Array("AQIDBA");
    expect([...bytes]).toEqual([1, 2, 3, 4]);
  });

  it("decodes base64url padding-less with URL-safe characters", () => {
    const bytes = urlBase64ToUint8Array(vector);
    expect([...bytes]).toEqual([251, 255, 190]);
  });

  it("encodes subscription key bytes back as base64url JSON", () => {
    const json = subscriptionToPushJSON({
      endpoint: "https://push.example/subscriptions/a",
      getKey: (name: string) =>
        name === "p256dh"
          ? new Uint8Array([1, 2, 3, 4]).buffer
          : new Uint8Array([251, 255, 190]).buffer,
    });
    expect(json).toEqual({
      endpoint: "https://push.example/subscriptions/a",
      keys: { p256dh: "AQIDBA", auth: vector },
    });
  });
});

const storageWith = (entries: Record<string, string>): Storage => {
  const map = new Map(Object.entries(entries));
  return {
    getItem: (key: string) => map.get(key) ?? null,
  } as unknown as Storage;
};

const placeJson = JSON.stringify({
  v: 1,
  place: {
    displayName: "Luleå, Norrbotten County, Sweden",
    shortName: "Luleå",
    latitude: 65.5848,
    longitude: 22.1546,
    fetchedAt: "2026-09-18T10:00:00.000Z",
    country: "Sweden",
    countryCode: "se",
  },
});

describe("collecting the settings object from app storage (ticket 02)", () => {
  it("sends the Alert threshold, the stored place and the place timezone", () => {
    const weather = {
      v: 1,
      latitude: 65.5848,
      longitude: 22.1546,
      weather: {
        current: {
          observedAt: "2026-09-18T20:15",
          temperatureC: 6,
          humidityPercent: 70,
          cloudCoverPercent: 40,
          cloudLowPercent: 10,
          cloudMidPercent: 20,
          cloudHighPercent: 30,
          weatherCode: 0,
          windSpeedKmh: 12,
        },
        hourly: [{ time: "2026-09-18T20:00", temperatureC: 6, humidityPercent: 70, cloudCoverPercent: 40, cloudLowPercent: 10, cloudMidPercent: 20, cloudHighPercent: 30, weatherCode: 0 }],
        daily: [{ date: "2026-09-18", weatherCode: 0, temperatureMaxC: 10, temperatureMinC: 4, sunrise: "2026-09-18T06:00", sunset: "2026-09-18T18:00" }],
        utcOffsetSeconds: 7200,
        timezone: "Europe/Stockholm",
        fetchedAt: "2026-09-18T20:15:00.000Z",
      },
    };
    const settings = collectSettings(
      {
        endpoint: "https://push.example/subscriptions/a",
        keys: { p256dh: "k", auth: "a" },
      },
      storageWith({
        [KP_THRESHOLD_STORAGE_KEY]: JSON.stringify({ kp: 7, v: 1 }),
        [PLACE_STORAGE_KEY]: placeJson,
        [WEATHER_STORAGE_KEY]: JSON.stringify(weather),
      }),
    );
    expect(settings.alertThreshold).toBe(7);
    expect(settings.place).toEqual({
      latitude: 65.5848,
      longitude: 22.1546,
      shortName: "Luleå",
    });
    expect(settings.placeTimezone).toBe("Europe/Stockholm");
    expect(settings.alertTypes).toEqual({ daily: true, kp: true, live: true });
    expect(settings.gates).toEqual(DEFAULT_GATES);
  });

  it("falls back to the default Alert threshold and the device timezone", () => {
    const settings = collectSettings(
      {
        endpoint: "https://push.example/subscriptions/a",
        keys: { p256dh: "k", auth: "a" },
      },
      storageWith({ [PLACE_STORAGE_KEY]: placeJson }),
    );
    expect(settings.alertThreshold).toBe(DEFAULT_KP_THRESHOLD);
    expect(settings.placeTimezone).toBe(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
  });

  it("sends the stored alert type toggles and hindrance gates (ticket 06)", () => {
    const settings = collectSettings(
      {
        endpoint: "https://push.example/subscriptions/a",
        keys: { p256dh: "k", auth: "a" },
      },
      storageWith({
        [PLACE_STORAGE_KEY]: placeJson,
        [ALERT_SETTINGS_STORAGE_KEY]: JSON.stringify({
          v: 1,
          settings: {
            alertTypes: { daily: false, kp: true, live: false },
            gates: {
              cloudMaxPercent: 70,
              noPrecipitation: false,
              darknessBand: "any",
            },
          },
        }),
      }),
    );
    expect(settings.alertTypes).toEqual({ daily: false, kp: true, live: false });
    expect(settings.gates).toEqual({
      cloudMaxPercent: 70,
      noPrecipitation: false,
      darknessBand: "any",
    });
  });
});

describe("the enable and disable flows (ticket 02)", () => {
  const vapidKey = urlBase64ToUint8Array("AQIDBA");

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const fakeSubscription = {
    endpoint: "https://push.example/subscriptions/a",
    getKey: (name: string) =>
      name === "p256dh"
        ? new Uint8Array([1, 2, 3, 4]).buffer
        : new Uint8Array([251, 255, 190]).buffer,
    unsubscribe: vi.fn(async () => true),
  };

  const depsWith = (
    registration: ServiceWorkerRegistration | null,
    responses: Map<string, Response | Error>,
    vapidKeyOverride: string | null = "AQIDBA",
  ): PushClientDeps => ({
    getRegistration: vi.fn(async () => registration),
    vapidPublicKey: vapidKeyOverride ?? undefined,
    fetch: vi.fn(async (input: string) => {
      const hit = responses.get(input);
      if (hit instanceof Error) throw hit;
      return hit ?? new Response("{}", { status: 500 });
    }),
  });

  it("subscribes with the app-server key and stores the settings object", async () => {
    const responses = new Map<string, Response | Error>([
      [SUBSCRIBE_URL, new Response("{}", { status: 200 })],
    ]);
    const registration = {
      pushManager: {
        subscribe: vi.fn(async () => fakeSubscription),
      },
    } as unknown as ServiceWorkerRegistration;
    const deps = depsWith(registration, responses);
    const subscription = await enablePush(deps, storageWith({}));
    expect(subscription.endpoint).toBe("https://push.example/subscriptions/a");
    expect(subscription.keys.p256dh.length).toBeGreaterThan(0);
    const subscribeCall = (registration.pushManager.subscribe as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(subscribeCall.userVisibleOnly).toBe(true);
    expect([...(subscribeCall.applicationServerKey as Uint8Array)]).toEqual([
      ...vapidKey,
    ]);
    const fetchCall = (deps.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchCall[0]).toBe(SUBSCRIBE_URL);
    expect(JSON.parse(fetchCall[1].body).subscription.endpoint).toBe(
      "https://push.example/subscriptions/a",
    );
    expect(JSON.parse(fetchCall[1].body).alertThreshold).toBe(5);
  });

  it("refuses to subscribe without the app-server key", async () => {
    // A developer's local .env (the maintainer's manual VAPID step) must not
    // leak into this contract: the missing-key rule is pinned, env aside.
    vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "");
    const deps = depsWith({} as ServiceWorkerRegistration, new Map(), null);
    await expect(enablePush(deps, storageWith({}))).rejects.toThrow(
      /application server key/i,
    );
  });

  it("fails honestly when no service worker is registered", async () => {
    const deps = depsWith(null, new Map());
    await expect(enablePush(deps, storageWith({}))).rejects.toThrow(
      /service worker/i,
    );
  });

  it("surfaces a failed settings POST instead of storing silently", async () => {
    const responses = new Map<string, Response | Error>([
      [SUBSCRIBE_URL, new Error("network down")],
    ]);
    const registration = {
      pushManager: {
        subscribe: vi.fn(async () => fakeSubscription),
      },
    } as unknown as ServiceWorkerRegistration;
    const deps = depsWith(registration, responses);
    await expect(enablePush(deps, storageWith({}))).rejects.toThrow(
      /network down/i,
    );
  });

  it("disabling deletes the stored subscription and unsubscribes the browser", async () => {
    const unsubscribeUrl = `${UNSUBSCRIBE_URL}?endpoint=${encodeURIComponent(fakeSubscription.endpoint)}`;
    const responses = new Map<string, Response | Error>([
      [unsubscribeUrl, new Response("{}", { status: 200 })],
    ]);
    const registration = {
      pushManager: {
        getSubscription: vi.fn(async () => fakeSubscription),
      },
    } as unknown as ServiceWorkerRegistration;
    const deps = depsWith(registration, responses);
    await disablePush(deps);
    expect(fakeSubscription.unsubscribe).toHaveBeenCalled();
    const fetchCall = (deps.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchCall[0]).toBe(
      `${UNSUBSCRIBE_URL}?endpoint=${encodeURIComponent(fakeSubscription.endpoint)}`,
    );
    expect(fetchCall[1].method).toBe("DELETE");
  });

  it("disabling still deletes the stored subscription when the browser has none", async () => {
    const knownEndpoint = "https://push.example/subscriptions/b";
    const unsubscribeUrl = `${UNSUBSCRIBE_URL}?endpoint=${encodeURIComponent(knownEndpoint)}`;
    const responses = new Map<string, Response | Error>([
      [unsubscribeUrl, new Response("{}", { status: 200 })],
    ]);
    const registration = {
      pushManager: {
        getSubscription: vi.fn(async () => null),
      },
    } as unknown as ServiceWorkerRegistration;
    const deps = depsWith(registration, responses);
    const endpoints = ["https://push.example/subscriptions/b"];
    await disablePush(deps, endpoints);
    const fetchCall = (deps.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchCall[0]).toBe(
      `${UNSUBSCRIBE_URL}?endpoint=${encodeURIComponent("https://push.example/subscriptions/b")}`,
    );
  });
});
