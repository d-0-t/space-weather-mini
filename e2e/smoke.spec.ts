import { expect, test } from "@playwright/test";

const dataTimeout = 60_000;

test("the app boots with navigation chrome on every page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  await expect(
    page.getByText("Space Weather Mini", { exact: true }),
  ).toBeVisible();
  for (const label of ["Dashboard", "About", "Explainers"]) {
    await expect(
      page.getByRole("link", { name: label, exact: true }),
    ).toBeVisible();
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

test("aurora ovals sit side by side at half width, never stacked", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page
      .getByRole("img", { name: /Aurora Forecast.*North Pole/i })
      .first(),
  ).toBeVisible({ timeout: dataTimeout });
  const tiles = page.locator(".aurora-images__tile");
  await expect(tiles).toHaveCount(2);
  const [north, south] = await tiles.evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width };
    }),
  );
  // Same row, equal halves of the container, adjacent – never wrapped
  expect(north.y).toBe(south.y);
  expect(Math.abs(north.w - south.w)).toBeLessThanOrEqual(2);
  const container = await page.locator(".aurora-images").boundingBox();
  expect(container).not.toBeNull();
  expect(north.w + south.w).toBeGreaterThan(container!.width - 6);
  expect(south.x).toBeGreaterThanOrEqual(north.x + north.w - 2);
});

test("home panels collapse and expand via their chevron toggle", async ({
  page,
}) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Solar Wind", exact: true });
  const chart = page.getByRole("img", {
    name: /Solar wind speed.*2 hours before Now/i,
  });
  await expect(chart).toBeVisible({ timeout: dataTimeout });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(chart).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(chart).toBeVisible();
});

test("the header logo links back to the dashboard via click and Enter", async ({
  page,
}) => {
  await page.goto("/about");
  await expect(
    page.getByRole("heading", { level: 1, name: "About" }),
  ).toBeVisible();
  const brand = page.getByRole("link", { name: /space weather mini/i });
  await brand.click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeVisible();
  await page.goto("/about");
  await brand.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeVisible();
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
  await expect(page.getByRole("img", { name: /kp index trend.*moon illumination/i })).toBeVisible();
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

test("home shows live now dashboard with Kp, mini charts and Kp min/max table", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^Aurora Now$/ })).toBeVisible({ timeout: dataTimeout });
  await expect(page.getByRole("heading", { name: /^Forecast$/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Solar Wind/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Magnetosphere/ })).toBeVisible();
  await expect(page.getByRole("table", { name: /Kp-index forecast/ })).toBeVisible();
  // Live freshness
  await expect(page.getByText(/Updated/ ).first()).toBeVisible();
  // Charts paired with tables
  await expect(page.getByRole("img", { name: /Kp observed.*forecast.*Now/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /Solar wind speed.*2 hours before Now/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /Kiruna magnetogram/i })).toBeVisible();
  // Mini charts carry a vertical axis; the four L1 charts carry a Now line
  await expect(page.locator(".live-panel .recharts-yAxis")).toHaveCount(7);
  // Solar Wind: 4 Now lines (one per L1 chart); Magnetosphere: 1 (hemi mirror zero)
  await expect(page.locator(".solar-wind .recharts-reference-line-line")).toHaveCount(4);
  await expect(page.locator(".magnetosphere .recharts-reference-line-line")).toHaveCount(1);
  await expect(
    page.locator(".solar-wind .recharts-reference-line-line").first(),
  ).toHaveAttribute("x", /^\d+\.?\d*$/);
  // Now lines are labelled like in the Forecast panel
  await expect(
    page.locator(".solar-wind").getByText("Now", { exact: true }).first(),
  ).toBeVisible();
  // Propagation-delay explainer
  await expect(page.getByText(/We are \d+ minutes behind .*data, based on solar wind speed/)).toBeVisible();
  // Native collapsible "?" help on every card
  await expect(page.locator(".live-panel .live-panel__help").first()).toBeVisible();
  await page.locator(".live-panel .live-panel__help").first().locator("summary").click();
  await expect(page.getByText(/< 400 km\/s/)).toBeVisible();
  await expect(page.getByText("About solar wind")).toBeAttached();
  // Source attributions at the bottom of the panels
  await expect(page.getByRole("link", { name: "NOAA/SWPC" }).first()).toBeVisible();
});
