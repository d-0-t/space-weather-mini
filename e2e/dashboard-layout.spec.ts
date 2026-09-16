import { expect, test, type Page } from "@playwright/test";

const noOverflow = async (page: Page) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
};

const flowColumns = (page: Page) => page.locator(".home__flow__col");
const webcamsShell = (page: Page) => page.locator(".container.webcams");

test.describe("Dashboard wide buckets (dashboard-layout ticket 04)", () => {
  test("below md stays 1-column", async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(flowColumns(page)).toHaveCount(1);
    await noOverflow(page);
  });

  test("from md to below xl renders equal-halves 2-column", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(flowColumns(page)).toHaveCount(2);
    const boxes = await Promise.all(
      [0, 1].map(async (i) => flowColumns(page).nth(i).boundingBox()),
    );
    expect(boxes[0]).not.toBeNull();
    expect(boxes[1]).not.toBeNull();
    const ratio = boxes[1]!.width / boxes[0]!.width;
    expect(ratio).toBeGreaterThan(0.9);
    expect(ratio).toBeLessThan(1.1);
    await noOverflow(page);
  });

  test("at xl renders middle-widest 3-column", async ({ page }) => {
    await page.setViewportSize({ width: 1650, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(flowColumns(page)).toHaveCount(3);
    const boxes = await Promise.all(
      [0, 1, 2].map(async (i) => flowColumns(page).nth(i).boundingBox()),
    );
    for (const box of boxes) expect(box).not.toBeNull();
    const middleToSide = boxes[1]!.width / boxes[0]!.width;
    expect(middleToSide).toBeGreaterThan(1.7);
    expect(middleToSide).toBeLessThan(2.3);
    await noOverflow(page);
  });

  test("landscape phones get the 2-column reflow below md", async ({ page }) => {
    // orientation landscape + min-width 670px + max-height 500px.
    await page.setViewportSize({ width: 740, height: 360 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(flowColumns(page)).toHaveCount(2);
    await noOverflow(page);
  });

  test("Dashboard caps at 1600px while Webcams goes full-bleed", async ({ page }) => {
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeVisible({ timeout: 60_000 });
    const flowMax = await page
      .locator(".home__flow")
      .evaluate((el) => getComputedStyle(el).maxWidth);
    expect(flowMax).toBe("1600px");

    await page.goto("/webcams");
    await expect(
      page.getByRole("heading", { level: 1, name: "Webcams" }),
    ).toBeVisible({ timeout: 60_000 });
    const webcamsMax = await webcamsShell(page)
      .evaluate((el) => getComputedStyle(el).maxWidth);
    expect(webcamsMax).toBe("none");
    await noOverflow(page);
  });

  test("Details and About family stay narrow", async ({ page }) => {
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.goto("/about");
    await expect(
      page.getByRole("heading", { level: 1, name: "This site" }),
    ).toBeVisible({ timeout: 60_000 });
    const aboutMax = await page
      .locator(".container")
      .first()
      .evaluate((el) => getComputedStyle(el).maxWidth);
    expect(aboutMax).toBe("800px");
    // Sources renders instantly (no data fetch) and shares the narrow shell.
    await page.goto("/about/sources");
    await expect(
      page.getByRole("heading", { level: 1, name: "Sources" }),
    ).toBeVisible({ timeout: 60_000 });
    const sourcesMax = await page
      .locator(".container")
      .first()
      .evaluate((el) => getComputedStyle(el).maxWidth);
    expect(sourcesMax).toBe("800px");
    await noOverflow(page);
  });
});
