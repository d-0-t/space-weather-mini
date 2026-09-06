import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const dataTimeout = 60_000;

test("home page passes axe audit with live dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^Aurora now$/ })).toBeVisible({ timeout: dataTimeout });
  await expect(page.getByRole("heading", { name: /^Solar wind$/ })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("home page passes axe audit in color-blind mode", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^Aurora now$/ })).toBeVisible({ timeout: dataTimeout });
  const toggle = page.getByRole("checkbox", { name: "Color-blind mode" });
  await expect(toggle).toBeVisible();
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await expect(toggle).toBeChecked();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
