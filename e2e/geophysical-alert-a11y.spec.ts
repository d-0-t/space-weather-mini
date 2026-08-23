import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const dataTimeout = 60_000;

test("the geophysical alert page passes the axe audit", async ({ page }) => {
  await page.goto("/forecasts/geoalert");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Geophysical Observations and Predictions",
    })
  ).toBeVisible({ timeout: dataTimeout });

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
