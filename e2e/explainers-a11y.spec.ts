import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

// The checked-in 27-day outlook fixture keeps this journey off the live NOAA
// feed, so it stays deterministic when the suite runs in parallel.
const outlookFixture = readFileSync(
  "./src/products/fixtures/27-day-outlook.txt",
  "utf8",
);

test("the explainers page renders", async ({ page }) => {
  await page.goto("/explainers");
  await expect(page.getByRole("heading", { level: 1, name: "Explainers" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Kp index" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Aurora forecast" })).toBeVisible();
  await expect(page.locator("#kp-index")).toBeVisible();
  await expect(page.locator("#aurora-forecast")).toBeVisible();
  // The Explainers link lives inside the About submenu
  await page.locator("#about-disclosure > summary").click();
  await expect(page.getByRole("navigation").getByRole("link", { name: "Explainers", exact: true })).toBeVisible();
});

test("the explainers page passes the axe audit", async ({ page }) => {
  await page.goto("/explainers");
  await expect(page.getByRole("heading", { level: 1, name: "Explainers" })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("deep links scroll to the glossary anchor", async ({ page }) => {
  await page.goto("/explainers#radio-flux");
  await expect(
    page.getByRole("heading", { level: 2, name: "Radio flux" }),
  ).toBeInViewport();
});

test("product pages open the glossary entry in place, not by navigating away", async ({
  page,
}) => {
  await page.route("**/text/27-day-outlook.txt", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/plain",
      body: outlookFixture,
    }),
  );
  await page.goto("/forecasts/27days");
  const term = page.getByRole("button", { name: /radio flux/i });
  await expect(term).toBeVisible({ timeout: 30_000 });
  // The term is a popup control now – no anchor that navigates to Explainers
  await expect(page.getByRole("link", { name: /radio flux/i })).toHaveCount(0);

  await term.click();
  const body = page.getByText(/solar radio flux at 10\.7 cm/i);
  await expect(body).toBeVisible();
  // Opening moves focus into the popup; the full-glossary link is reachable
  // by keyboard from there
  await expect(
    page.getByRole("button", { name: "Close: Radio flux" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: /read the full glossary/i }),
  ).toBeFocused();
  // A quiet path to the full glossary anchor stays available
  await expect(
    page.getByRole("link", { name: /read the full glossary/i }),
  ).toHaveAttribute("href", /\/explainers#radio-flux$/);
  // The reader keeps their place: opening the popup never changes the route
  await expect(page).toHaveURL(/\/forecasts\/27days$/);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  // Escape dismisses the popup and returns focus to the term
  await page.keyboard.press("Escape");
  await expect(body).toHaveCount(0);
  await expect(term).toBeFocused();
});
