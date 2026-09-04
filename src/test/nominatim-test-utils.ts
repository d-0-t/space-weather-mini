/**
 * Shared test doubles for the Nominatim seam: a fetch response shaped like
 * the real Nominatim JSON payload and a navigator.geolocation stub. Used by
 * the geocoding unit suite and the Local conditions component suite so the
 * two never drift apart.
 */

import { vi } from "vitest";

export type RetryAfterResponse = Response & {
  withRetryAfter: (seconds: number) => Response;
};

export const jsonResponse = (
  body: unknown,
  status = 200,
): RetryAfterResponse =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: async () => body,
    withRetryAfter(seconds: number): Response {
      this.headers.set("retry-after", String(seconds));
      return this;
    },
  }) as RetryAfterResponse;

export type GeolocationStub =
  | { kind: "ok"; latitude: number; longitude: number; accuracy: number }
  | { kind: "error"; code: number };

/** Replaces navigator.geolocation with a single-shot stub; returns the mock. */
export const stubGeolocation = (impl: GeolocationStub): ReturnType<typeof vi.fn> => {
  const getCurrentPosition = vi.fn(
    (
      success: (p: { coords: { latitude: number; longitude: number; accuracy: number } }) => void,
      error: (e: { code: number }) => void,
    ) => {
      if (impl.kind === "ok") {
        success({
          coords: {
            latitude: impl.latitude,
            longitude: impl.longitude,
            accuracy: impl.accuracy,
          },
        });
      } else {
        error({ code: impl.code });
      }
    },
  );
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });
  return getCurrentPosition;
};

/** Restores navigator.geolocation after a stub. */
export const restoreGeolocation = (): void => {
  delete (navigator as { geolocation?: unknown }).geolocation;
};