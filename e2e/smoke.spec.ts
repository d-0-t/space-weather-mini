import { expect, test } from "@playwright/test";

const dataTimeout = 60_000;

test("the app boots with navigation chrome on every page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  await expect(
    page.getByText("Space Weather Mini", { exact: true }),
  ).toBeVisible();
  for (const label of ["Dashboard", "Webcams", "Local conditions"]) {
    await expect(
      page.getByRole("link", { name: label, exact: true }),
    ).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Webcams", exact: true })).toHaveAttribute("href", "/webcams");
  await expect(page.getByRole("link", { name: "Local conditions", exact: true })).toHaveAttribute("href", "/conditions");
  await expect(page.locator("#forecasts-disclosure > summary")).toBeVisible();
  await page.locator("#forecasts-disclosure > summary").click();
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
  // The About entry is a submenu with This site / Sources / Explainers
  await expect(page.locator("#about-disclosure > summary")).toBeVisible();
  await page.locator("#about-disclosure > summary").click();
  for (const label of ["This site", "Sources", "Explainers"]) {
    await expect(page.getByRole("navigation").getByRole("link", { name: label, exact: true })).toBeVisible();
  }
});

test("the keyboard navigation opens the Details submenu and Escape returns focus", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.locator("#forecasts-disclosure > summary");
  const details = page.locator("#forecasts-disclosure");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("open", "");
  const firstLink = page.getByRole("navigation").getByRole("link", { name: "Daily Data", exact: true });
  await expect(firstLink).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(firstLink).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(details).not.toHaveAttribute("open");
  await expect(trigger).toBeFocused();
  // Space toggles too, like every native disclosure
  await page.keyboard.press(" ");
  await expect(details).toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  await expect(details).not.toHaveAttribute("open");
});

test("the keyboard navigation opens the About submenu and Escape returns focus", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.locator("#about-disclosure > summary");
  const details = page.locator("#about-disclosure");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("open", "");
  const firstLink = page.getByRole("navigation").getByRole("link", { name: "This site", exact: true });
  await expect(firstLink).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(firstLink).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(details).not.toHaveAttribute("open");
  await expect(trigger).toBeFocused();
});

test("opening one submenu closes the other", async ({ page }) => {
  await page.goto("/");
  const details = page.locator("#forecasts-disclosure");
  const about = page.locator("#about-disclosure");
  await details.locator("summary").click();
  await expect(details).toHaveAttribute("open", "");
  await about.locator("summary").click();
  await expect(about).toHaveAttribute("open", "");
  await expect(details).not.toHaveAttribute("open");
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

test("the oval glow map renders full width in Aurora Now", async ({
  page,
}) => {
  await page.goto("/");
  const oval = page.getByRole("img", { name: /oval glow/i });
  await expect(oval).toBeVisible({ timeout: dataTimeout });
  // One pole-to-pole world map painted across the full stage width
  const box = await oval.boundingBox();
  // The full-size modal's stage shares the class, so the inline one is
  // first in the DOM - name it explicitly.
  const stage = await page.locator(".oval-glow__stage").first().boundingBox();
  expect(box).not.toBeNull();
  expect(stage).not.toBeNull();
  expect(Math.abs(box!.width - stage!.width)).toBeLessThanOrEqual(2);
});

test("the oval glow map opens full size in a modal and Escape closes it", async ({
  page,
}) => {
  await page.goto("/");
  const oval = page.getByRole("img", { name: /oval glow/i });
  await expect(oval).toBeVisible({ timeout: dataTimeout });
  await page
    .getByRole("button", { name: "Oval glow intensity, full size" })
    .click();
  // Name the dialog: the Dashboard carries one media modal per media.
  const dialog = page.getByRole("dialog", {
    name: "Oval glow intensity, full size",
  });
  await expect(dialog).toBeVisible();
  // The modal carries its own stage plus the shared legend, and the stage
  // is genuinely bigger than the inline map.
  const modalStage = dialog.locator(".oval-glow__stage--modal");
  await expect(modalStage).toBeVisible();
  await expect(dialog.locator(".oval-glow__legend")).toBeVisible();
  const modalBox = await modalStage.boundingBox();
  const inlineBox = await page.locator(".oval-glow__stage").first().boundingBox();
  expect(modalBox!.width).toBeGreaterThan(inlineBox!.width);
  // Landscape shares the map upright: the rotate offer is portrait-only.
  await expect(page.getByRole("button", { name: /rotate map/i })).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("the full-size modal rotates the map in portrait for more map", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const oval = page.getByRole("img", { name: /oval glow/i });
  await expect(oval).toBeVisible({ timeout: dataTimeout });
  await page
    .getByRole("button", { name: "Oval glow intensity, full size" })
    .click();
  const rotate = page.getByRole("button", { name: /rotate map/i });
  await expect(rotate).toBeVisible();
  const stage = page.locator(".oval-glow__stage--modal");
  const upright = await stage.boundingBox();
  await rotate.click();
  const rotated = await stage.boundingBox();
  // Rotating turns the stage 90deg, so its bounding box swaps: the long
  // axis now runs down the phone and exceeds the upright full width.
  expect(rotated!.height).toBeGreaterThan(upright!.width);
  expect(rotated!.height).toBeGreaterThan(rotated!.width);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Oval glow intensity, full size" }),
  ).toBeHidden();
});

test("home panels collapse and expand via their chevron toggle", async ({
  page,
}) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Solar wind", exact: true });
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
    page.getByRole("heading", { level: 1, name: "This site" }),
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
  await expect(page.getByRole("heading", { level: 1, name: "This site" })).toBeVisible();
});

test("the sources subpage renders", async ({ page }) => {
  await page.goto("/about/sources");
  await expect(page.getByRole("heading", { level: 1, name: "Sources" })).toBeVisible();
  await expect(page.getByRole("link", { name: /SWPC NOAA/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Open-Meteo/ })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: /^Aurora now$/ })).toBeVisible({ timeout: dataTimeout });
  await expect(page.getByRole("heading", { name: /^Forecast$/ })).toBeVisible();
  // The Solar Wind panel swaps its loading heading for the loaded one once
  // the live feeds arrive - both need the data timeout.
  await expect(page.getByRole("heading", { name: /^Solar wind$/ })).toBeVisible({ timeout: dataTimeout });
  await expect(page.getByRole("heading", { name: /Magnetosphere/ })).toBeVisible({ timeout: dataTimeout });
  await expect(page.getByRole("table", { name: /Kp-index forecast/ })).toBeVisible();
  // Live freshness
  await expect(page.getByText(/Updated/ ).first()).toBeVisible();
  // Charts paired with tables
  await expect(page.getByRole("img", { name: /Kp observed.*forecast.*Now/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /Solar wind speed.*2 hours before Now/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /Kiruna magnetogram/i })).toBeVisible({
    timeout: dataTimeout,
  });
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
  // The popover label (and its "Close:" twin) stay attached
  await expect(page.getByText("About solar wind").first()).toBeAttached();
  // Source attributions at the bottom of the panels
  await expect(page.getByRole("link", { name: "NOAA/SWPC" }).first()).toBeVisible();
});
