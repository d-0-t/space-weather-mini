import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const dataTimeout = 60_000;

test("home page passes axe audit with live dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^Aurora Now$/ })).toBeVisible({ timeout: dataTimeout });
  await expect(page.getByRole("heading", { name: /Solar Wind/ })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
