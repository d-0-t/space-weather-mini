import { expect, test } from "@playwright/test";

const dataTimeout = 60_000;

test("the app boots with navigation chrome on every page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
  await expect(page.locator("#navLogo")).toHaveText("Space Weather Mini");
  for (const label of ["Home", "Forecasts & Discussion", "About"]) {
    await expect(page.getByRole("link", { name: label })).toBeVisible();
  }
  await page.getByRole("link", { name: "Forecasts & Discussion" }).hover();
  for (const label of [
    "Geophysical Alert",
    "Daily Data",
    "3 Day Report",
    "Weekly Report",
    "27 Day Outlook",
    "Forecast Discussion",
  ]) {
    await expect(page.getByRole("link", { name: label })).toBeVisible();
  }
});

test("the about page renders", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1, name: "About" })).toBeVisible();
});

test("the forecasts index renders the forecast discussion", async ({ page }) => {
  await page.goto("/forecasts");
  await expect(page.getByRole("heading", { level: 2, name: "Forecast Discussion" })).toBeVisible();
});

test("the forecast discussion page renders", async ({ page }) => {
  await page.goto("/forecasts/discussion");
  await expect(page.getByRole("heading", { level: 2, name: "Forecast Discussion" })).toBeVisible();
});

test("the daily geomagnetic indices page renders its data table", async ({ page }) => {
  await page.goto("/forecasts/daily");
  await expect(page.getByRole("heading", { level: 3, name: "Last 30 Days - Geomagnetic Data" })).toBeVisible({ timeout: dataTimeout });
});

test("the 3-day forecast page renders its data", async ({ page }) => {
  await page.goto("/forecasts/3days");
  await expect(page.locator("[id='3-days']")).toBeVisible({ timeout: dataTimeout });
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
  await expect(page.getByText("As of:")).toBeVisible();
  await expect(page.getByRole("img", { name: /radio flux, a index and kp index trend/i })).toBeVisible();
});

test("the geophysical alert page renders", async ({ page }) => {
  await page.goto("/forecasts/geoalert");
  await expect(page.getByRole("heading", { level: 2, name: "Geophysical Observations and Predictions" })).toBeVisible({ timeout: dataTimeout });
});