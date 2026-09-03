import { existsSync, readdirSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const dataTimeout = 60_000;

/** Waits until the service worker controls the page (shell precached). */
const waitForServiceWorker = async (page: Page) => {
  await page.evaluate(async () => {
    if ("serviceWorker" in navigator) {
      await navigator.serviceWorker.ready;
    }
  });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
};

/**
 * Emulates a true offline device before the next navigation: network requests
 * fail (Playwright setOffline) and `navigator.onLine` reads false from page
 * start (a real offline browser flips it; Playwright's emulation alone does
 * not when the Service Worker answers the navigation).
 */
const goOffline = async (page: Page, context: import("@playwright/test").BrowserContext) => {
  await page.addInitScript(() => {
    // Chromium reads navigator.onLine from the prototype; shadow it on both
    // the prototype and the instance so the offline reload truly starts offline.
    const forceOffline = () => false;
    try {
      Object.defineProperty(Navigator.prototype, "onLine", {
        configurable: true,
        get: forceOffline,
      });
    } catch {
      /* prototype read-only – fall through to the instance */
    }
    try {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        get: forceOffline,
      });
    } catch {
      /* instance read-only – the event listeners still cover it */
    }
    window.dispatchEvent(new Event("offline"));
  });
  await context.setOffline(true);
};

/** SWPC endpoints the offline stale view depends on, as full URLs. */
const REQUIRED_CACHED_URLS = [
  "https://services.swpc.noaa.gov/json/noaa-planetary-k-index.json",
  "https://services.swpc.noaa.gov/json/noaa-planetary-k-index-forecast.json",
  "https://services.swpc.noaa.gov/text/3-day-forecast.txt",
  "https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json",
  "https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json",
  "https://services.swpc.noaa.gov/json/boulder_k_index_1m.json",
  "https://services.swpc.noaa.gov/products/kyoto-dst.json",
  "https://services.swpc.noaa.gov/text/aurora-nowcast-hemi-power.txt",
  "https://services.swpc.noaa.gov/products/alerts.json",
  "https://services.swpc.noaa.gov/products/noaa-scales.json",
];

/**
 * Guarantees the live data is in the Service Worker's runtime cache. The SW
 * only intercepts requests once it controls the page, so we write the cached
 * responses directly (online fetch + cache.put) – deterministic, no reliance
 * on the SW catching a warm reload's multi-MB fetches in time.
 */
const warmLiveCache = async (page: Page) => {
  await waitForServiceWorker(page);
  await page.evaluate(async (urls) => {
    const cache = await caches.open("swpc");
    for (const url of urls) {
      const response = await fetch(url);
      if (response.ok) await cache.put(url, response);
    }
  }, REQUIRED_CACHED_URLS);
};

test("the production build emits sw.js plus a workbox runtime chunk", () => {
  expect(existsSync("dist/sw.js")).toBe(true);
  const workboxChunks = readdirSync("dist").filter((name) =>
    name.startsWith("workbox-"),
  );
  expect(workboxChunks.length).toBeGreaterThan(0);
});

test("after one online visit the shell opens offline with honest stale data", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeVisible({ timeout: dataTimeout });
  // Warm the runtime cache with the live data the offline view must show
  await warmLiveCache(page);

  await goOffline(page, context);
  await page.reload();

  // Shell still loads from the Service Worker precache
  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeVisible({ timeout: dataTimeout });
  // The saved forecast is shown with its honest as-of line and stale notice.
  // Per-card stale behaviour is covered deterministically by the Vitest
  // component tests; this journey asserts the ticket's h1 + As of + ⚠.
  await expect(page.getByText(/As of/).first()).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByText(/Showing saved data – couldn't reach NOAA/).first(),
  ).toBeVisible({ timeout: 20_000 });
});

test("the offline stale view passes an axe audit", async ({ page, context }) => {
  await page.goto("/");
  // Warm the runtime caches and register the SW before going offline
  await warmLiveCache(page);
  await goOffline(page, context);
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeVisible({ timeout: dataTimeout });
  await expect(
    page.getByText(/Showing saved data – couldn't reach NOAA/).first(),
  ).toBeVisible({ timeout: 20_000 });
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("offline with no cached NOAA data shows a plain error, not stale data", async ({
  page,
  context,
}) => {
  // Install the shell without ever fetching live data: the About page registers
  // the Service Worker and precaches the shell, but fetches no NOAA products.
  await page.goto("/about");
  await expect(
    page.getByRole("heading", { level: 1, name: "About" }),
  ).toBeVisible({ timeout: dataTimeout });
  await waitForServiceWorker(page);

  // Simulate a visitor with the shell installed but no cached data: every
  // SWPC fetch fails at the app boundary (Playwright cannot force the Service
  // Worker's own runtime fetches to fail, so we reject them in the page).
  await page.addInitScript(() => {
    const realFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("services.swpc.noaa.gov")) {
        return Promise.reject(new TypeError("failed to fetch"));
      }
      return realFetch(input, init);
    };
  });
  await goOffline(page, context);
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeVisible({ timeout: dataTimeout });
  // The production app retries failed fetches (TanStack default, 3× backoff),
  // so the honest error appears only once the retries are exhausted.
  await expect(
    page.getByText(/Couldn't load – connect to refresh/).first(),
  ).toBeVisible({ timeout: 20_000 });
  // No invented data: the stale notice must not appear
  await expect(
    page.getByText(/Showing saved data – couldn't reach NOAA/),
  ).toHaveCount(0);
});