import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

import AxeBuilder from "@axe-core/playwright";

import { ovationJson } from "../src/test/ovation-test-utils";

/**
 * The Possible locations panel's Home journey (dashboard-layout ticket 01):
 * the built app names the towns where the aurora may be seen for the
 * current observed Kp in its own Dashboard panel after the Oval glow
 * intensity panel, only while each town is dark; the panel passes an axe
 * audit and the element survives the narrow layout.
 *
 * Seams under test (DOM only, no internals): `.reach-towns` rows with
 * their flag alt and probability class, DOM order against `.kp-bar` and
 * `.oval-glow`, the absence of the element when nothing qualifies,
 * the axe result and the page width at 390px. Every journey pins the
 * device clock and serves checked-in fixtures.
 */

const kpObservedFixture = readFileSync(
  new URL(
    "../src/products/fixtures/noaa-planetary-k-index.json",
    import.meta.url,
  ),
  "utf8",
);
const windFixture = readFileSync(
  new URL("../src/products/fixtures/rtsw-wind-1m.json", import.meta.url),
  "utf8",
);
const magFixture = readFileSync(
  new URL("../src/products/fixtures/rtsw-mag-1m.json", import.meta.url),
  "utf8",
);
// The real Open-Meteo Kiruna payload, so no panel surface reaches the network.
const openMeteoKirunaFixture = JSON.parse(
  readFileSync(
    new URL("../src/data/fixtures/open-meteo-kiruna.json", import.meta.url),
    "utf8",
  ),
);

// The one grid cell the OVATION stub serves: Luleå (the default place).
const ovationGrid = ovationJson([[22.1546, 65.5848, 12]]);

/** Serves the panel's feeds from checked-in fixtures – no wall clock, no NOAA. */
const stubPanelFeeds = async (page: Page): Promise<void> => {
  await page.route("**/products/noaa-planetary-k-index.json", (route) =>
    route.fulfill({ contentType: "application/json", body: kpObservedFixture }),
  );
  await page.route("**/json/rtsw/rtsw_wind_1m.json", (route) =>
    route.fulfill({ contentType: "application/json", body: windFixture }),
  );
  await page.route("**/json/rtsw/rtsw_mag_1m.json", (route) =>
    route.fulfill({ contentType: "application/json", body: magFixture }),
  );
  await page.route("**/json/ovation_aurora_latest.json", (route) =>
    route.fulfill({ contentType: "application/json", body: ovationGrid }),
  );
  await page.route("**/api.open-meteo.com/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: openMeteoKirunaFixture,
    }),
  );
};

/** Freezes the clock and opens Home with the panel feeds stubbed. */
const openHome = async (page: Page, instant: string): Promise<void> => {
  await page.clock.install({ time: new Date(instant) });
  await stubPanelFeeds(page);
  await page.goto("/");
};

test("names the towns in reach for the current Kp in the Possible locations panel", async ({
  page,
}) => {
  // The fixture's latest observed Kp 1 puts the edge at 64°; at
  // 2026-12-21T12:00Z Fairbanks (MLAT 65.67) is at 02:10 local – deep
  // night – and Yellowknife (68.52) at 04:22.
  await openHome(page, "2026-12-21T12:00:00Z");

  const reach = page.locator(".reach-towns");
  const fairbanks = reach.locator(".reach-towns__town", {
    hasText: "Fairbanks",
  });
  await expect(fairbanks.locator("img")).toHaveAttribute(
    "src",
    "https://flagcdn.com/16x12/us.png",
  );
  await expect(fairbanks.locator("img")).toHaveAttribute(
    "alt",
    "United States",
  );
  // Ranked bars, titled with the band explanation (never a promise).
  const probability = fairbanks.locator(".reach-towns__probability");
  await expect(probability).toHaveClass(/reach-towns__probability--possible/);
  await expect(
    fairbanks.locator(".reach-towns__probability-icon"),
  ).toHaveAttribute("title", /Possible .*May be seen, not promised\./);

  // The list lives in its own panel after the Oval glow intensity panel.
  await expect(
    page.getByRole("heading", { name: /^Possible locations$/ }),
  ).toBeVisible();
  await expect(page.locator(".oval-glow")).toBeVisible();
  expect(
    await page.evaluate(() => {
      const kpBar = document.querySelector(".kp-bar")!;
      const oval = document.querySelector(".oval-glow")!;
      const towns = document.querySelector(".reach-towns")!;
      return (
        Boolean(
          kpBar.compareDocumentPosition(towns) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        ) &&
        Boolean(
          oval.compareDocumentPosition(towns) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        )
      );
    }),
  ).toBe(true);
});

test("renders at most one town per band per country, capped at 12 rows", async ({
  page,
}) => {
  await openHome(page, "2026-12-21T12:00:00Z");
  await expect(page.locator(".reach-towns")).toBeVisible();

  const rows = await page.locator(".reach-towns__town").evaluateAll((items) =>
    items.map((item) => ({
      country: item.querySelector(".reach-towns__flag")?.getAttribute("alt"),
      band: Array.from(
        item.querySelector(".reach-towns__probability")?.classList ?? [],
      ).find((cls) => cls.startsWith("reach-towns__probability--")),
    })),
  );
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.length).toBeLessThanOrEqual(12);
  const bandPerCountry = rows.map((row) => `${row.country}/${row.band}`);
  expect(new Set(bandPerCountry).size).toBe(bandPerCountry.length);
});

test("renders nothing when no town is both in reach and dark", async ({
  page,
}) => {
  // Midsummer Kp 1: every town at or poleward of the 64° edge is in
  // daylight, midnight sun or bright twilight.
  await openHome(page, "2026-06-21T12:00:00Z");
  await expect(
    page.getByRole("heading", { name: /^Aurora now$/ }),
  ).toBeVisible();
  await expect(page.locator(".reach-towns")).toHaveCount(0);
});

test("the Possible locations panel passes an axe audit", async ({ page }) => {
  await openHome(page, "2026-12-21T12:00:00Z");
  await expect(page.locator(".reach-towns")).toBeVisible();
  const results = await new AxeBuilder({ page })
    .include(".possible-locations-panel")
    .analyze();
  expect(results.violations).toEqual([]);
});

test.describe("the Possible locations panel at a narrow width", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("fits the viewport without horizontal overflow", async ({ page }) => {
    await openHome(page, "2026-12-21T12:00:00Z");
    await expect(page.locator(".reach-towns__town").first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
