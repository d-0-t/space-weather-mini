import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GeocodeMatch } from "../../data/geocoding";
import { useGeocodedPlace } from "./useGeocodedPlace";

describe("the stored geocoded place (ticket 02)", () => {
  const senderCalls = (urlFragment: string) =>
    (
      mockFetch.mock.calls as Array<[string, unknown?]>
    ).filter((call) => call[0].includes(urlFragment));

  const mockFetch = vi.fn();

  const installWorker = () => {
    Object.defineProperty(window.navigator, "serviceWorker", {
      value: {
        getRegistration: vi.fn(async () => ({
          pushManager: {
            getSubscription: vi.fn(async () => ({
              endpoint: "https://push.example/subscriptions/a",
              getKey: (name: string) =>
                name === "p256dh"
                  ? new Uint8Array([1, 2, 3, 4]).buffer
                  : new Uint8Array([251, 255, 190]).buffer,
            })),
          },
        })),
      },
      configurable: true,
    });
  };

  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
    mockFetch.mockImplementation(async () => ({
      ok: true,
      text: async () => "",
    }));
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    Reflect.deleteProperty(window.navigator, "serviceWorker");
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("picking a place re-sends the settings so the sender follows the Dashboard", async () => {
    vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "AQIDBA");
    installWorker();
    const { result } = renderHook(() => useGeocodedPlace());
    const match: GeocodeMatch = {
      displayName: "Kiruna, Norrbotten County, Sweden",
      shortName: "Kiruna",
      latitude: 67.8558,
      longitude: 20.2253,
      country: "Sweden",
      countryCode: "se",
    };
    act(() => {
      result.current.pick(match);
    });
    await vi.waitFor(() =>
      expect(senderCalls("/.netlify/functions/subscribe")).toHaveLength(1),
    );
    const body = JSON.parse(
      (senderCalls("/.netlify/functions/subscribe")[0][1] as { body: string })
        .body,
    );
    expect(body.place).toEqual({
      latitude: 67.8558,
      longitude: 20.2253,
      shortName: "Kiruna",
    });
  });
});
