import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

/** The checked-in real Kiruna Open-Meteo payload, served to the app. */
const openMeteoKirunaFixture = JSON.parse(
  readFileSync(
    new URL("../src/data/fixtures/open-meteo-kiruna.json", import.meta.url),
    "utf8",
  ),
);

/**
 * Local conditions renders its daylight entirely on device with suncalc
 * (ADR 0005) – no fetch needed. Weather (ticket 03) fetches one Open-Meteo
 * payload per place, so every journey intercepts the API with the checked-in
 * real Kiruna fixture: the journey asserts the app's own DOM, never the
 * network. The full geocoding journey arrives with later tickets.
 */

/** Answers the Open-Meteo forecast API with the real Kiruna fixture. */
const stubWeatherApi = (page: Page): (() => number) => {
  let fetches = 0;
  void page.route("**/api.open-meteo.com/**", async (route) => {
    fetches += 1;
    await route.fulfill({
      contentType: "application/json",
      json: openMeteoKirunaFixture,
    });
  });
  return () => fetches;
};

test("the local conditions page renders the luminosity timeline for the default place", async ({
  page,
}) => {
  stubWeatherApi(page);
  await page.goto("/conditions");
  await expect(
    page.getByRole("heading", { level: 1, name: "Local conditions" }),
  ).toBeVisible();
  await expect(
    page.getByText("Östersund, Jämtland County, Sweden").first(),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  // The timeline splits the day into luminosity bands; the Day band is
  // always present at the default place across the seasons.
  await expect(
    page.getByRole("listitem").filter({ hasText: "Day" }).first(),
  ).toBeVisible();

  // Break times alternate top/bottom between neighbouring bands so they
  // never collide: the first band's start (00:00) sits high, the second
  // band's start low, the third high again.
  const bands = page.getByRole("listitem");
  const timeBoxes = await bands.evaluateAll((items) =>
    items.map((item) => {
      const time = item.querySelector(".conditions__band-time");
      if (!time) return null;
      const rect = time.getBoundingClientRect();
      return { y: rect.y + rect.height / 2, height: rect.height };
    }),
  );
  const atTop = timeBoxes.filter((box) => box !== null) as Array<{
    y: number;
    height: number;
  }>;
  expect(atTop.length).toBeGreaterThanOrEqual(3);
  const midY = (index: number) => atTop[index].y;
  expect(midY(0)).toBeLessThan(midY(1));
  expect(midY(2)).toBeLessThan(midY(1));

  // Names read vertically on wide screens, rotated 180° from the plain
  // vertical flow
  const rotation = await page
    .locator(".conditions__band-name")
    .first()
    .evaluate((el) => getComputedStyle(el).transform);
  expect(rotation).toContain("matrix(-1");
});

test("the local conditions page renders the weather card from the Kiruna fixture", async ({
  page,
}) => {
  const weatherFetches = stubWeatherApi(page);
  await page.goto("/conditions");

  // Current conditions: temperature, WMO text, humidity and the total cloud
  // with the low/mid/high split – humidity and cloud now icons with sr-only
  // labels and low/mid/high on separate lines. WMO icon carries title and an
  // sr-only span before the temp.
  await expect(page.getByText("11°C").first()).toBeVisible();
  await expect(page.getByText("Moderate rain").first()).toBeVisible();
  await expect(
    page.locator(".weather-current").getByText("97%").first(),
  ).toBeVisible();
  await expect(
    page.locator(".weather-current").getByText("low: 100%"),
  ).toBeVisible();
  await expect(
    page.locator(".weather-current").getByText("mid: 22%"),
  ).toBeVisible();
  await expect(
    page.locator(".weather-current").getByText("high: 17%"),
  ).toBeVisible();
  await expect(page.locator(".weather-current-wrap")).toBeVisible();
  await expect(
    page.locator('.weather-icon[title="Moderate rain"]').first(),
  ).toBeVisible();
  await expect(
    page.locator(".weather-current__main .sr-only", {
      hasText: "Moderate rain",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Open-Meteo" })).toHaveAttribute(
    "href",
    "https://open-meteo.com/",
  );
  await expect(
    page.getByText(/Updated at \d{2}:\d{2}, near/),
  ).toBeVisible();
  // h2 sections are now collapsible via CollapsiblePanel – the headings are
  // toggle buttons with aria-expanded
  await expect(page.getByRole("button", { name: "Weather" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Location" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "External maps" }),
  ).toBeVisible();

  // The 24 h hourly strip is a scrollable list of hour cards, time first.
  const strip = page.getByRole("list", { name: "24-hour hourly strip" });
  await expect(strip.getByRole("listitem")).toHaveCount(24);
  await expect(strip.getByText("00:00")).toBeVisible();
  await expect(strip.getByText("23:00")).toBeVisible();
  const scrolls = await strip.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  expect(scrolls.scrollWidth).toBeGreaterThan(scrolls.clientWidth);

  // The 3 day daily row is a semantic table with a caption and three rows.
  const table = page.getByRole("table", { name: /3-day weather forecast/ });
  await expect(table).toBeVisible();
  await expect(table.getByRole("row")).toHaveCount(4);
  await expect(table.getByText("2026-09-01")).toBeVisible();
  await expect(table.getByText("05:06")).toBeVisible();
  await expect(table.getByText("20:11")).toBeVisible();

  // Refresh is always enabled and reissues the same fetch for the same
  // place, keeping the timestamp visible.
  const refresh = page.getByRole("button", { name: "Refresh" });
  await expect(refresh).toBeEnabled();
  const fetchesBefore = weatherFetches();
  await refresh.click();
  await expect(refresh).toBeEnabled();
  await expect(page.getByText(/Updated at \d{2}:\d{2}, near/)).toBeVisible();
  await expect.poll(() => weatherFetches()).toBe(fetchesBefore + 1);
});

test("the local conditions page passes the axe audit", async ({ page }) => {
  stubWeatherApi(page);
  await page.goto("/conditions");
  await expect(
    page.getByRole("heading", { level: 1, name: "Local conditions" }),
  ).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test.describe("local conditions narrow layout", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("flips the luminosity timeline into a vertical scale without overflow", async ({
    page,
  }) => {
    stubWeatherApi(page);
    await page.goto("/conditions");
    const timeline = page.locator(".conditions__timeline");
    await expect(timeline).toBeVisible();
    const direction = await timeline.evaluate(
      (el) => getComputedStyle(el).flexDirection,
    );
    expect(direction).toBe("column");
    // The hourly strip scrolls inside its card; the page itself never
    // overflows horizontally.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});