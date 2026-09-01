import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Local conditions renders its daylight entirely on device with suncalc
 * (ADR 0005) – no fetch, no intercepted network needed. The journey asserts
 * the app's own DOM: heading, default place, the luminosity timeline and
 * the axe audit. The full geocoding/weather journey arrives with later
 * tickets.
 */
test("the local conditions page renders the luminosity timeline for the default place", async ({
  page,
}) => {
  await page.goto("/conditions");
  await expect(
    page.getByRole("heading", { level: 1, name: "Local conditions" }),
  ).toBeVisible();
  await expect(
    page.getByText("Östersund, Jämtland County, Sweden"),
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

test("the local conditions page passes the axe audit", async ({ page }) => {
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
    await page.goto("/conditions");
    const timeline = page.locator(".conditions__timeline");
    await expect(timeline).toBeVisible();
    const direction = await timeline.evaluate(
      (el) => getComputedStyle(el).flexDirection,
    );
    expect(direction).toBe("column");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});