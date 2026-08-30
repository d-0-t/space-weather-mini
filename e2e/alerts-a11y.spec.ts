import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const alertsFixture = readFileSync(
  "./src/products/fixtures/alerts.json",
  "utf8",
);
const dataTimeout = 60_000;

// The alert settings modal sits behind a feature flag; the e2e web server
// builds with VITE_ALERTS_ENABLED=true (playwright.config.ts), so the Alerts
// button is present in the Dashboard header here.
test("alert settings modal filters the fixture feed to the threshold and passes axe", async ({
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
  const dialog = page.locator("dialog.alerts-dialog");
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Alerts" }).click();
  await expect(dialog).toBeVisible({ timeout: dataTimeout });
  await expect(
    dialog.getByRole("heading", { name: "Alerts" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("slider", { name: /Kp alert threshold/ }),
  ).toHaveValue("5");
  await expect(dialog.locator(".alerts__strip")).toBeVisible();
  await expect(dialog.locator(".alerts__strip")).toHaveCount(1);
  await expect(dialog.locator(".alerts__strip__color")).toHaveCount(1);
  await expect(
    dialog.getByRole("button", { name: /browser alerts/i }),
  ).toBeVisible();
  await expect(
    dialog.getByText(/Alerts while this tab is open\./),
  ).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});