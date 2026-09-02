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

/** Real Nominatim search fixtures: Springfield (5 matches) and Kiruna (2). */
const nominatimSpringfieldFixture = JSON.parse(
  readFileSync(
    new URL("../src/data/fixtures/nominatim-springfield.json", import.meta.url),
    "utf8",
  ),
);
const nominatimKirunaFixture = JSON.parse(
  readFileSync(
    new URL("../src/data/fixtures/nominatim-kiruna.json", import.meta.url),
    "utf8",
  ),
);

/** A 1×1 transparent PNG for every flag/image request (flagcdn, etc.). */
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * Local conditions renders its daylight entirely on device with suncalc
 * (ADR 0005) – no fetch needed. Weather (ticket 03) fetches one Open-Meteo
 * payload per place, so every journey intercepts the API with the checked-in
 * real Kiruna fixture: the journey asserts the app's own DOM, never the
 * network. Nominatim search/reverse and all images are stubbed the same way
 * (ticket 05).
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

/**
 * Answers Nominatim search with the checked-in fixtures (Springfield → 5
 * matches, Kiruna → 2, anything else → empty) and reverse with the Kiruna
 * match. Counts search calls so throttling stays observable.
 */
const stubNominatimApi = (page: Page): (() => number) => {
  let searches = 0;
  void page.route("**/nominatim.openstreetmap.org/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/search")) {
      searches += 1;
      const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
      const json = q.includes("springfield")
        ? nominatimSpringfieldFixture
        : q.includes("kiruna")
          ? nominatimKirunaFixture
          : [];
      await route.fulfill({ contentType: "application/json", json });
      return;
    }
    if (url.pathname.endsWith("/reverse")) {
      await route.fulfill({
        contentType: "application/json",
        json: nominatimKirunaFixture[0],
      });
      return;
    }
    await route.continue();
  });
  return () => searches;
};

/**
 * Serves every image (flags, etc.) from memory – never the network. Uses
 * `fallback` (not `continue`) so the Open-Meteo and Nominatim stubs
 * registered alongside still see their requests.
 */
const stubExternalImages = async (page: Page): Promise<void> => {
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() === "image") {
      await route.fulfill({ contentType: "image/png", body: PNG_1PX });
      return;
    }
    await route.fallback();
  });
};

test("the local conditions page renders the luminosity timeline for the default place", async ({
  page,
}) => {
  stubWeatherApi(page);
  await page.goto("/conditions");
  await expect(
    page.getByRole("heading", { level: 1, name: "Local conditions" }),
  ).toBeVisible();
  // The place chip shows the short name as visible text; the full display
  // name lives on the title attribute (ticket 01 default is Östersund).
  const chip = page.locator(".conditions__place");
  await expect(chip).toContainText("Östersund, Jämtland County");
  await expect(chip).toHaveAttribute(
    "title",
    "Östersund, Jämtland County, Sweden",
  );
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
  // toggle buttons with aria-expanded (exact match: "Find my location"
  // contains "Location" as a substring, so the toggle needs exact:true).
  await expect(
    page.getByRole("button", { name: "Weather", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Location", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "External maps", exact: true }),
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

test("the place search journey shows five matches and updates the place, daylight and links", async ({
  page,
}) => {
  const weatherFetches = stubWeatherApi(page);
  stubNominatimApi(page);
  await stubExternalImages(page);
  await page.goto("/conditions");

  // One h1, default Östersund place chip (short name visible, full on title).
  await expect(
    page.getByRole("heading", { level: 1, name: "Local conditions" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  const chip = page.locator(".conditions__place");
  await expect(chip).toContainText("Östersund, Jämtland County");

  // Visible label on the search field; no per-keystroke fetch happens.
  const field = page.getByRole("searchbox", { name: "Search for a place" });
  await expect(field).toBeVisible();
  await expect(page.getByText("Search for a place")).toBeVisible();

  // Type a place and submit with Enter → five radio matches appear.
  await field.fill("Springfield");
  await field.press("Enter");
  const radios = page.getByRole("radio");
  await expect(radios).toHaveCount(5);
  await expect(
    page.getByRole("radio", {
      name: "Springfield, Sangamon County, Illinois, United States",
    }),
  ).toBeVisible();

  // Picking one updates the stored place chip …
  await page
    .getByRole("radio", {
      name: "Springfield, Hampden County, Massachusetts, United States",
    })
    .click();
  await expect(chip).toContainText("Springfield, Hampden County");
  await expect(chip).toHaveAttribute(
    "title",
    "Springfield, Hampden County, Massachusetts, United States",
  );

  // … keeps Today's daylight chart on screen …
  await expect(
    page.getByRole("heading", { name: "Today's daylight chart" }),
  ).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Day" }).first(),
  ).toBeVisible();

  // … keeps current weather plus the 24 h strip and the 3-day table …
  await expect(page.getByText("11°C").first()).toBeVisible();
  const strip = page.getByRole("list", { name: "24-hour hourly strip" });
  await expect(strip.getByRole("listitem")).toHaveCount(24);
  const scrolls = await strip.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  expect(scrolls.scrollWidth).toBeGreaterThan(scrolls.clientWidth);
  const table = page.getByRole("table", { name: /3-day weather forecast/ });
  await expect(table.getByRole("row")).toHaveCount(4);

  // … and re-bakes both external links with the picked lat/lon.
  const pollution = page.getByRole("link", {
    name: "See light pollution at this spot on lightpollutionmap.info",
  });
  await expect(pollution).toHaveAttribute("href", /lat=42\.1018764/);
  await expect(pollution).toHaveAttribute("href", /lon=-72\.5886727/);
  const cloud = page.getByRole("link", {
    name: "See live cloud cover on weather-radar-live.com",
  });
  await expect(cloud).toHaveAttribute("href", /lat=42\.1018764/);
  await expect(cloud).toHaveAttribute("href", /lon=-72\.5886727/);

  // Refresh stays enabled, reissues the same weather fetch and keeps the
  // fetched-at timestamp visible.
  const refresh = page.getByRole("button", { name: "Refresh" });
  await expect(refresh).toBeEnabled();
  const before = weatherFetches();
  await refresh.click();
  await expect(refresh).toBeEnabled();
  await expect(page.getByText(/Updated at \d{2}:\d{2}, near/)).toBeVisible();
  await expect.poll(() => weatherFetches()).toBe(before + 1);
});

test("the June at 69 N place shows the midnight-sun polar copy", async ({
  page,
}) => {
  // Freeze the clock to midsummer so Kiruna's sun never sets (ticket 04
  // pins the same case in Vitest with fake timers).
  await page.clock.install({ time: new Date("2026-06-21T12:00:00Z") });
  const weatherFetches = stubWeatherApi(page);
  expect(weatherFetches).toBeDefined();
  stubNominatimApi(page);
  await stubExternalImages(page);
  await page.goto("/conditions");

  const field = page.getByRole("searchbox", { name: "Search for a place" });
  await field.fill("Kiruna");
  await field.press("Enter");
  await expect(page.getByRole("radio")).toHaveCount(2);
  await page
    .getByRole("radio", {
      name: "Kiruna, Kiruna kommun, Norrbottens län, 981 30, Sverige",
    })
    .click();

  // Only Today renders (Tomorrow removed per product decision, ticket 04);
  // the single Day band carries the honest polar copy.
  await expect(page.getByText("Sun does not set today")).toBeVisible();
  const names = await page
    .locator(".conditions__band-name")
    .evaluateAll((els) => els.map((el) => el.textContent?.trim()));
  expect(names).toEqual(["Day"]);
});

test("the page meets the ticket 05 accessibility bar", async ({ page }) => {
  stubWeatherApi(page);
  stubNominatimApi(page);
  await stubExternalImages(page);
  await page.goto("/conditions");
  await expect(
    page.getByRole("heading", { level: 1, name: "Local conditions" }),
  ).toBeVisible();

  // One h1 per page.
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

  // Search field has a visible label; the five matches use radio semantics.
  await expect(page.getByText("Search for a place")).toBeVisible();
  const field = page.getByRole("searchbox", { name: "Search for a place" });
  await field.fill("Springfield");
  await field.press("Enter");
  await expect(page.getByRole("radio")).toHaveCount(5);

  // Hourly strip is a list, daily row is a table with a caption.
  await expect(
    page.getByRole("list", { name: "24-hour hourly strip" }),
  ).toBeVisible();
  const table = page.getByRole("table", { name: /3-day weather forecast/ });
  await expect(table.locator("caption")).toContainText(
    "3-day weather forecast",
  );

  // Icon buttons use title plus visible/sr-only text – never aria-label
  // where text can name them (coding-standards).
  const labelled = await page
    .locator(".conditions [aria-label]")
    .evaluateAll((els) => els.map((el) => el.outerHTML.slice(0, 120)));
  expect(labelled).toEqual([]);
  const refresh = page.getByRole("button", { name: "Refresh" });
  await expect(refresh).toHaveAttribute("title", "Refresh");
  await expect(refresh).not.toHaveAttribute("aria-label", /.*/);

  // Skip link is first, targets main content and reveals on focus.
  const skip = page.getByRole("link", { name: /skip to main content/i });
  await expect(skip).toHaveAttribute("href", "#main-content");
  await skip.focus();
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
});

test("the local conditions page passes the axe audit", async ({ page }) => {
  stubWeatherApi(page);
  stubNominatimApi(page);
  await stubExternalImages(page);
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
    stubNominatimApi(page);
    await stubExternalImages(page);
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