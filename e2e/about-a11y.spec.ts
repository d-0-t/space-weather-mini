import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the about page renders and passes the axe audit", async ({ page }) => {
  await page.goto("/about");
  await expect(
    page.getByRole("heading", { level: 1, name: "This site" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "A very short biography" }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
