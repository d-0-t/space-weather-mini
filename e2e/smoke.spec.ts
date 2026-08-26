import { expect, test } from "@playwright/test";

const dataTimeout = 60_000;

test("the app boots with navigation chrome on every page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
  await expect(page.getByText("Space Weather Mini")).toBeVisible();
  for (const label of ["Home", "About", "Explainers"]) {
    await expect(page.getByRole("link", { name: label })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Details" })).toBeVisible();
  await page.getByRole("button", { name: "Details" }).click();
  for (const label of [
    "Geophysical Alert",
    "Daily Data",
    "3-Day Forecast",
    "Weekly Report",
    "27 Day Outlook",
    "Forecast Discussion",
  ]) {
    await expect(page.getByRole("navigation").getByRole("link", { name: label, exact: true })).toBeVisible();
  }
});

test("the keyboard navigation opens the Details submenu and Escape returns focus", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Details" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const firstLink = page.getByRole("navigation").getByRole("link", { name: "Geophysical Alert", exact: true });
  await expect(firstLink).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(firstLink).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
});

test("the skip link is the first focusable element and targets main", async ({
  page,
}) => {
  await page.goto("/");
  const skipLink = page.getByRole("link", { name: /skip to main content/i });
  await expect(skipLink).toHaveAttribute("href", "#main-content");
  // Tab from address bar lands on skip link first
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await skipLink.click();
  await expect(page.locator("#main-content")).toBeFocused();
});

test("the about page renders", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1, name: "About" })).toBeVisible();
});

test("the forecasts index renders the forecast discussion", async ({ page }) => {
  await page.goto("/forecasts");
  await expect(page.getByRole("heading", { level: 1, name: "Forecast Discussion" })).toBeVisible({ timeout: dataTimeout });
});

test("the forecast discussion page renders", async ({ page }) => {
  await page.goto("/forecasts/discussion");
  await expect(page.getByRole("heading", { level: 1, name: "Forecast Discussion" })).toBeVisible({ timeout: dataTimeout });
  await expect(page.getByText("Issued (UTC):")).toBeVisible();
});

test("the daily geomagnetic indices page renders its data table", async ({ page }) => {
  await page.goto("/forecasts/daily");
  const table = page.getByRole("table");
  await expect(table).toBeVisible({ timeout: dataTimeout });
  await expect(table.getByRole("row")).toHaveCount(32);
  await expect(page.getByText("Issued (UTC):")).toBeVisible();
  await expect(page.getByRole("img", { name: /largest daily kp index per station/i })).toBeVisible();
});

test("the 3-day forecast page renders its data", async ({ page }) => {
  await page.goto("/forecasts/3days");
  const table = page.getByRole("table");
  await expect(table.first()).toBeVisible({ timeout: dataTimeout });
  await expect(table).toHaveCount(3);
  await expect(page.getByText("Issued (UTC):")).toBeVisible();
  await expect(
    page.getByRole("img", { name: /kp index forecast by 3-hour interval/i })
  ).toBeVisible();
});

test("the weekly report page renders its data", async ({ page }) => {
  await page.goto("/forecasts/weekly");
  await expect(page.locator("#weekly-discussion")).toBeVisible({ timeout: dataTimeout });
});

test("the 27-day outlook page renders its data", async ({ page }) => {
  await page.goto("/forecasts/27days");
  const table = page.getByRole("table");
  await expect(table).toBeVisible({ timeout: dataTimeout });
  await expect(table.getByRole("row")).toHaveCount(28);
  await expect(page.getByText("Issued (UTC):")).toBeVisible();
  await expect(page.getByRole("img", { name: /radio flux, a index and kp index trend/i })).toBeVisible();
});

test("the geophysical alert page renders", async ({ page }) => {
  await page.goto("/forecasts/geoalert");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Geophysical Observations and Predictions",
    }),
  ).toBeVisible({ timeout: dataTimeout });
});

test("home shows live now dashboard with Kp, mini charts and Live min/max table", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^Live$/ })).toBeVisible({ timeout: dataTimeout });
  await expect(page.getByRole("heading", { name: /Space Weather Now/ })).toBeVisible();
  await expect(page.getByRole("table", { name: /Kp-index forecast/ })).toBeVisible();
  // Live freshness
  await expect(page.getByText(/Updated/ ).first()).toBeVisible();
  // Charts paired with tables
  await expect(page.getByRole("img", { name: /Kp observed.*forecast.*Now/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /Solar wind speed, last 3 hours/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /Kiruna magnetogram/i })).toBeVisible();
  // Mini charts carry a vertical axis; the four L1 charts carry a Now line
  await expect(page.locator(".space-weather-now .recharts-yAxis")).toHaveCount(7);
  await expect(page.locator(".space-weather-now .recharts-reference-line-line")).toHaveCount(4);
  await expect(
    page.locator(".space-weather-now .recharts-reference-line-line").first(),
  ).toHaveAttribute("x", /^\d+\.?\d*$/);
  // Now lines are labelled like in the Live panel
  await expect(
    page.locator(".space-weather-now").getByText("Now", { exact: true }).first(),
  ).toBeVisible();
  // Propagation-delay explainer
  await expect(page.getByText(/We are \d+ minutes behind .*data, based on solar wind speed/)).toBeVisible();
});
