import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const dataTimeout = 60_000;

test("the forecast discussion page passes the axe audit", async ({ page }) => {
  await page.goto("/forecasts/discussion");
  await expect(
    page.getByRole("heading", { level: 1, name: "Forecast Discussion" })
  ).toBeVisible({ timeout: dataTimeout });

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
