import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const alertsFixture = readFileSync(
  "./src/products/fixtures/alerts.json",
  "utf8",
);
const dataTimeout = 60_000;

test("alerts banner filters the fixture feed to the threshold and passes axe", async ({
  page,
}) => {
  await page.route("**/alerts.json", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: alertsFixture,
    }),
  );
  await page.addInitScript(() => {
    localStorage.setItem("sw:thresholds:v1", JSON.stringify({ kp: 5, v: 1 }));
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Alerts" })).toBeVisible({
    timeout: dataTimeout,
  });
  await expect(
    page.getByRole("slider", { name: /Kp alert threshold/ }),
  ).toHaveValue("5");
  await expect(page.locator(".alerts__strip")).toBeVisible();
  await expect(page.locator(".alerts__strip")).toHaveCount(1);
  await expect(page.locator(".alerts__strip__color")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: /browser alerts/i }),
  ).toBeVisible();
  await expect(
    page.getByText(/Alerts while this tab is open\./),
  ).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});