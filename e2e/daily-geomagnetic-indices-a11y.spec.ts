import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const dataTimeout = 60_000;

test("the daily geomagnetic indices page passes the axe audit", async ({ page }) => {
  await page.goto("/forecasts/daily");
  await expect(page.getByRole("table")).toBeVisible({ timeout: dataTimeout });

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
