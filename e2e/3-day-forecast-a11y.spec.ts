import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const dataTimeout = 60_000;

test("the 3-day forecast page passes the axe audit", async ({ page }) => {
  await page.goto("/forecasts/3days");
  await expect(page.getByRole("table").first()).toBeVisible({ timeout: dataTimeout });

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
