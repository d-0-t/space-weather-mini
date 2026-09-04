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
    // Precache the shell: JS, CSS, HTML and the woff2 fonts only – data
    // products and images are runtime-cached, never precached.
    expect(PWA_OPTIONS.workbox.globPatterns).toEqual([
      "**/*.{js,css,html,woff2}",
    ]);
  });

  it("precaches the favicon and the manifest icon assets", () => {
    expect(PWA_OPTIONS.includeAssets).toEqual(["favicon.ico", "assets/*"]);
  });

  it("stale-while-revalidates NOAA SWPC data (50 entries, 1 hour)", () => {
    const [swpc, , ] = PWA_OPTIONS.workbox.runtimeCaching;
    expect(swpc.handler).toBe("StaleWhileRevalidate");
    expect(swpc.options?.cacheName).toBe("swpc");
    expect(swpc.options?.expiration).toEqual({
      maxEntries: 50,
      maxAgeSeconds: 3600,
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

  it("cache-firsts keyed Stadia dark tiles (20 entries, 7 days)", () => {
    const [, stadia] = PWA_OPTIONS.workbox.runtimeCaching;
    expect(stadia.handler).toBe("CacheFirst");
    expect(stadia.options?.cacheName).toBe("stadia");
    expect(stadia.options?.expiration).toEqual({
      maxEntries: 20,
      maxAgeSeconds: 604800,
    });
    expect(
      pattern(stadia.urlPattern).test(
        "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/1/0/0.png?api_key=abc",
      ),
    ).toBe(true);
  });

  it("cache-firsts OVATION aurora JPGs", () => {
    const [, , ovation] = PWA_OPTIONS.workbox.runtimeCaching;
    expect(ovation.handler).toBe("CacheFirst");
    expect(ovation.options?.cacheName).toBe("ovation-jpg");
    expect(ovation.options?.expiration).toEqual({
      maxEntries: 30,
      maxAgeSeconds: 3600,
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