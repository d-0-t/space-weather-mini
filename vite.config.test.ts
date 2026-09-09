import { describe, expect, it } from "vitest";

import { PWA_OPTIONS } from "./vite.config";

const pattern = (re: RegExp | undefined) => {
  expect(re).toBeInstanceOf(RegExp);
  return re as RegExp;
};

describe("PWA build configuration", () => {
  it("registers a generateSW auto-update service worker that claims the page", () => {
    expect(PWA_OPTIONS.strategies).toBe("generateSW");
    expect(PWA_OPTIONS.registerType).toBe("autoUpdate");
    expect(PWA_OPTIONS.manifest).toBe(false);
    expect(PWA_OPTIONS.workbox.skipWaiting).toBe(true);
    expect(PWA_OPTIONS.workbox.clientsClaim).toBe(true);
    // Precache the shell: JS, CSS, HTML, the woff2 fonts and the bundled
    // Natural Earth land asset – data products and images are
    // runtime-cached, never precached.
    expect(PWA_OPTIONS.workbox.globPatterns).toEqual([
      "**/*.{js,css,html,woff2,geojson}",
    ]);
  });

  it("falls back offline navigations to the precached shell", () => {
    // The generated worker already answers every SPA navigation with
    // index.html; pinning it here makes the offline deep-link behaviour
    // explicit and testable rather than a plugin default.
    expect(PWA_OPTIONS.workbox.navigateFallback).toBe("index.html");
  });

  it("precaches the favicon and the manifest icon assets", () => {
    expect(PWA_OPTIONS.includeAssets).toEqual(["favicon.ico", "assets/*"]);
  });

  it("stale-while-revalidates NOAA SWPC data (50 entries, 7 days)", () => {
    const [swpc] = PWA_OPTIONS.workbox.runtimeCaching;
    expect(swpc.handler).toBe("StaleWhileRevalidate");
    expect(swpc.options?.cacheName).toBe("swpc");
    // Workbox ExpirationPlugin refuses to serve entries older than
    // maxAgeSeconds, so the offline promise ("last fetched products stay
    // visible after one online visit") needs a lifetime that survives an
    // overnight offline stretch, not one hour. Seven days mirrors the
    // documented iOS eviction window.
    expect(swpc.options?.expiration).toEqual({
      maxEntries: 50,
      maxAgeSeconds: 604800,
    });
    const match = pattern(swpc.urlPattern);
    expect(
      match.test(
        "https://services.swpc.noaa.gov/json/noaa-planetary-k-index.json",
      ),
    ).toBe(true);
    expect(
      match.test("https://services.swpc.noaa.gov/text/discussion.txt"),
    ).toBe(true);
    expect(
      match.test("https://services.swpc.noaa.gov/products/alerts.json"),
    ).toBe(true);
    // The OVATION JPGs belong to the CacheFirst route – the data route must
    // not shadow them (Workbox matches routes in order, first match wins).
    expect(
      match.test(
        "https://services.swpc.noaa.gov/images/animations/ovation/north/latest.jpg",
      ),
    ).toBe(false);
  });

  it("keeps no GIBS tile route - the Oval basemap is a bundled asset now", () => {
    expect(
      PWA_OPTIONS.workbox.runtimeCaching.find((entry) =>
        String(entry.urlPattern).includes("gibs"),
      ),
    ).toBeUndefined();
  });

  it("cache-firsts country flags so they survive offline", () => {
    const flags = PWA_OPTIONS.workbox.runtimeCaching.find((entry) =>
      pattern(entry.urlPattern as RegExp).test(
        "https://flagcdn.com/16x12/se.png",
      ),
    );
    expect(flags).toBeDefined();
    expect(flags?.handler).toBe("CacheFirst");
    expect(flags?.options?.cacheName).toBe("flags");
    expect(flags?.options?.expiration).toEqual({
      maxEntries: 60,
      maxAgeSeconds: 604800,
    });
    // Flag pixels never change per size, so CacheFirst is safe; the retina
    // sizes ride the same rule.
    const match = pattern(flags?.urlPattern as RegExp);
    expect(match.test("https://flagcdn.com/32x24/no.png")).toBe(true);
    expect(match.test("https://flagcdn.com/48x36/is.png")).toBe(true);
  });

  it("cache-firsts OVATION aurora JPGs", () => {
    const [, ovation] = PWA_OPTIONS.workbox.runtimeCaching;
    expect(ovation.handler).toBe("CacheFirst");
    expect(ovation.options?.cacheName).toBe("ovation-jpg");
    // Same seven-day survival as the SWPC data cache: an expired entry is
    // never served, so a one-hour max-age would blank the aurora imagery
    // for anyone offline overnight.
    expect(ovation.options?.expiration).toEqual({
      maxEntries: 30,
      maxAgeSeconds: 604800,
    });
    const match = pattern(ovation.urlPattern);
    expect(
      match.test(
        "https://services.swpc.noaa.gov/images/animations/ovation/north/latest.jpg",
      ),
    ).toBe(true);
    expect(
      match.test(
        "https://services.swpc.noaa.gov/images/animations/ovation/south/latest.jpg",
      ),
    ).toBe(true);
    expect(
      match.test(
        "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json",
      ),
    ).toBe(false);
  });
});