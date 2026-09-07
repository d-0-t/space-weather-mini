import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the sources subpage renders and passes the axe audit", async ({
  page,
}) => {
  await page.goto("/about/sources");
  await expect(
    page.getByRole("heading", { level: 1, name: "Sources" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Data & Sources" }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
