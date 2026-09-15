import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

/** The checked-in real Kiruna Open-Meteo payload, served to the app. */
const openMeteoKirunaFixture = JSON.parse(
  readFileSync(
    new URL("../src/data/fixtures/open-meteo-kiruna.json", import.meta.url),
    "utf8",
  ),
);

/** Answers the Open-Meteo forecast API with the real Kiruna fixture. */
const stubWeatherApi = (page: Page): void => {
  void page.route("**/api.open-meteo.com/**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: openMeteoKirunaFixture,
    });
  });
};

/** Serves every image (flags, etc.) from memory – never the network. */
const stubExternalImages = async (page: Page): Promise<void> => {
  const PNG_1PX = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() === "image") {
      await route.fulfill({ contentType: "image/png", body: PNG_1PX });
      return;
    }
    await route.fallback();
  });
};

const sectionBox = (page: Page, selector: string) =>
  page.locator(selector).boundingBox();

interface SectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Bounding boxes of the two flex columns, left then right. */
const columnBoxes = (page: Page): Promise<SectionBox[]> =>
  Promise.all(
    [".conditions__col--left", ".conditions__col--right"].map(
      async (selector) => {
        const box = await sectionBox(page, selector);
        expect(box).not.toBeNull();
        return box as SectionBox;
      },
    ),
  );
/** Bounding boxes of the four sections in mobile stack order. */
const sectionBoxes = (page: Page): Promise<SectionBox[]> =>
  Promise.all(
    [
      ".conditions__day",
      ".conditions__weather",
      ".conditions__threeday",
      ".conditions__external",
    ].map(async (selector) => {
      const box = await sectionBox(page, selector);
      expect(box).not.toBeNull();
      return box as SectionBox;
    }),
  );

test.describe("local conditions two-column layout (dashboard-layout ticket 03)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("stacks daylight, Weather, Three-day weather forecast, External maps with no overflow", async ({
    page,
  }) => {
    stubWeatherApi(page);
    await stubExternalImages(page);
    await page.goto("/conditions");
    await expect(
      page.getByRole("heading", { level: 1, name: "Local conditions" }),
    ).toBeVisible();
    await expect(
      page.getByRole("table", { name: /Three-day weather forecast/ }),
    ).toBeVisible();

    // Single column: every section spans the full width and the
    // centers run top to bottom in the mobile stack order.
    const [day, weather, threeDay, external] = await sectionBoxes(page);
    const centerY = (box: { y: number; height: number }) =>
      box.y + box.height / 2;
    expect(centerY(day)).toBeLessThan(centerY(weather));
    expect(centerY(weather)).toBeLessThan(centerY(threeDay));
    expect(centerY(threeDay)).toBeLessThan(centerY(external));
    // Same column: left edges align within rounding.
    for (const box of [weather, threeDay, external]) {
      expect(Math.abs(box.x - day.x)).toBeLessThanOrEqual(2);
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("local conditions wide layout (dashboard-layout ticket 03)", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("maps daylight plus external maps left and Weather plus 3-day right, left narrower than right", async ({
    page,
  }) => {
    stubWeatherApi(page);
    await stubExternalImages(page);
    await page.goto("/conditions");
    await expect(
      page.getByRole("table", { name: /Three-day weather forecast/ }),
    ).toBeVisible();

    // Each column stacks its own sections with a uniform gap: measure the
    // columns, not the sections, so uneven card heights never matter.
    const [left, right] = await columnBoxes(page);
    const [day, weather, threeDay, external] = await sectionBoxes(page);

    // Fractions: the weather-heavy right column runs wider than the left
    // (flex 2 to 3, so the right is about one and a half times the left).
    const ratio = right.width / left.width;
    expect(ratio).toBeGreaterThan(1.3);
    expect(ratio).toBeLessThan(1.7);
    // Left column holds daylight plus external maps; right column holds
    // Weather plus the Three-day weather forecast.
    expect(Math.abs(external.x - day.x)).toBeLessThanOrEqual(8);
    expect(Math.abs(threeDay.x - weather.x)).toBeLessThanOrEqual(8);
    expect(weather.x).toBeGreaterThan(day.x + day.width);
    // Each column stacks top to bottom with no cross-column coupling.
    expect(day.y).toBeLessThan(external.y);
    expect(weather.y).toBeLessThan(threeDay.y);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("collapses the Three-day weather forecast without touching Weather", async ({
    page,
  }) => {
    stubWeatherApi(page);
    await stubExternalImages(page);
    await page.goto("/conditions");
    const table = page.getByRole("table", {
      name: /Three-day weather forecast/,
    });
    await expect(table).toBeVisible();

    await page
      .getByRole("button", { name: "Three-day weather forecast" })
      .click();
    await expect(table).toHaveCount(0);
    // Weather keeps its hourly strip, fetched-at line and attribution.
    await expect(
      page.getByRole("list", { name: "24-hour hourly strip" }),
    ).toBeVisible();
    await expect(page.getByText(/Updated at \d{2}:\d{2}, near/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Open-Meteo" })).toBeVisible();
  });
});

test.describe("local conditions mid-width layout (dashboard-layout ticket 03)", () => {
  test.use({ viewport: { width: 900, height: 900 } });

  test("stays two columns below the lg breakpoint with no overflow", async ({
    page,
  }) => {
    stubWeatherApi(page);
    await stubExternalImages(page);
    await page.goto("/conditions");
    await expect(
      page.getByRole("table", { name: /Three-day weather forecast/ }),
    ).toBeVisible();

    // Still side by side at 900px: the right column starts past the end
    // of the left one, keeping the 2-to-3 fractions.
    const [left, right] = await columnBoxes(page);
    const [day, weather, threeDay, external] = await sectionBoxes(page);
    expect(right.x).toBeGreaterThan(left.x + left.width);
    const ratio = right.width / left.width;
    expect(ratio).toBeGreaterThan(1.3);
    expect(ratio).toBeLessThan(1.7);
    expect(Math.abs(external.x - day.x)).toBeLessThanOrEqual(8);
    expect(Math.abs(threeDay.x - weather.x)).toBeLessThanOrEqual(8);
    expect(day.y).toBeLessThan(external.y);
    expect(weather.y).toBeLessThan(threeDay.y);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
