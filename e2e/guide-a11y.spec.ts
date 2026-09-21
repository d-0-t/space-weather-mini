import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the guide renders its five sections in the evening's order and passes the axe audit", async ({
  page,
}) => {
  await page.goto("/about/guide");
  await expect(
    page.getByRole("heading", { level: 1, name: "Aurora guide" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "What auroras are",
    "When to look",
    "Where to look",
    "What can hide aurora",
    "Before you go out",
  ]);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("the About submenu reaches the guide by keyboard", async ({ page }) => {
  await page.goto("/about");
  const disclosure = page.locator("#about-disclosure");
  const summary = disclosure.locator("> summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(disclosure).toHaveAttribute("open", "");

  const guide = page
    .getByRole("navigation")
    .getByRole("link", { name: "Aurora guide" });
  await expect(guide).toBeVisible();
  // The guide is the second submenu entry (Install & Alerts parked
  // 2026-09-21, see the background-push field findings): Tab through the
  // one link ahead of it, land on Guide, and activate it from the keyboard
  for (let i = 0; i < 2; i += 1) await page.keyboard.press("Tab");
  await expect(guide).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/about\/guide$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Aurora guide" }),
  ).toBeVisible();
});

test("the interpreter's guide link lands on the page", async ({ page }) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: /read aurora guide/i });
  await expect(link).toBeVisible({ timeout: 60_000 });
  await link.click();
  await expect(page).toHaveURL(/\/about\/guide$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Aurora guide" }),
  ).toBeVisible();
});

test("the guide's deep links land on the live panels", async ({ page }) => {
  await page.goto("/#view-distance");
  await expect(page.locator("#view-distance")).toBeInViewport({
    timeout: 60_000,
  });
  await page.goto("/#oval-glow");
  const oval = page.locator("#oval-glow");
  await expect(oval).toBeVisible({ timeout: 60_000 });
  await expect(oval).toBeInViewport();
});

test("the guide fits a mobile viewport without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/about/guide");
  await expect(
    page.getByRole("heading", { level: 1, name: "Aurora guide" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
