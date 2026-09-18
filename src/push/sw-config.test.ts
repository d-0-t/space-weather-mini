import { describe, expect, it } from "vitest";

import {
  SW_GLOB_PATTERNS,
  SW_NAVIGATE_FALLBACK,
  SW_RUNTIME_ROUTES,
} from "./sw-config";

const testPattern = (source: string, url: string): boolean =>
  new RegExp(source).test(url);

describe("owned service worker route table (ticket 02)", () => {
  it("precache globs the shell: js, css, html, woff2 and the Natural Earth asset", () => {
    expect(SW_GLOB_PATTERNS).toEqual(["**/*.{js,css,html,woff2,geojson}"]);
  });

  it("answers every SPA navigation with the precached shell offline", () => {
    expect(SW_NAVIGATE_FALLBACK).toBe("index.html");
  });

  it("stale-while-revalidates NOAA SWPC data (50 entries, 7 days)", () => {
    const [swpc] = SW_RUNTIME_ROUTES;
    expect(swpc.handler).toBe("StaleWhileRevalidate");
    expect(swpc.cacheName).toBe("swpc");
    expect(swpc.expiration).toEqual({ maxEntries: 50, maxAgeSeconds: 604800 });
    expect(
      testPattern(
        swpc.patternSource,
        "https://services.swpc.noaa.gov/json/noaa-planetary-k-index.json",
      ),
    ).toBe(true);
    expect(
      testPattern(
        swpc.patternSource,
        "https://services.swpc.noaa.gov/text/discussion.txt",
      ),
    ).toBe(true);
    expect(
      testPattern(
        swpc.patternSource,
        "https://services.swpc.noaa.gov/products/alerts.json",
      ),
    ).toBe(true);
    // The OVATION JPGs belong to the CacheFirst route – the data route must
    // not shadow them (routes match in order, first match wins).
    expect(
      testPattern(
        swpc.patternSource,
        "https://services.swpc.noaa.gov/images/animations/ovation/north/latest.jpg",
      ),
    ).toBe(false);
  });

  it("cache-firsts OVATION aurora JPGs (30 entries, 7 days)", () => {
    const [, ovation] = SW_RUNTIME_ROUTES;
    expect(ovation.handler).toBe("CacheFirst");
    expect(ovation.cacheName).toBe("ovation-jpg");
    expect(ovation.expiration).toEqual({
      maxEntries: 30,
      maxAgeSeconds: 604800,
    });
    expect(
      testPattern(
        ovation.patternSource,
        "https://services.swpc.noaa.gov/images/animations/ovation/north/latest.jpg",
      ),
    ).toBe(true);
    expect(
      testPattern(
        ovation.patternSource,
        "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json",
      ),
    ).toBe(false);
  });

  it("cache-firsts country flags so they survive offline (60 entries, 7 days)", () => {
    const flags = SW_RUNTIME_ROUTES[2];
    expect(flags.handler).toBe("CacheFirst");
    expect(flags.cacheName).toBe("flags");
    expect(flags.expiration).toEqual({
      maxEntries: 60,
      maxAgeSeconds: 604800,
    });
    expect(testPattern(flags.patternSource, "https://flagcdn.com/16x12/se.png")).toBe(
      true,
    );
    expect(
      testPattern(flags.patternSource, "https://flagcdn.com/48x36/is.png"),
    ).toBe(true);
  });

  it("keeps no GIBS tile route – the Oval basemap is a bundled asset", () => {
    expect(
      SW_RUNTIME_ROUTES.some((route) => route.patternSource.includes("gibs")),
    ).toBe(false);
  });
});
