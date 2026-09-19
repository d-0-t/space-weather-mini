import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the Install & Alerts page renders its sections and passes the axe audit", async ({
  page,
}) => {
  await page.goto("/about/install-alerts");
  await expect(
    page.getByRole("heading", { level: 1, name: "Install & Alerts" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "Install on mobile",
    "What background alerts do",
    "Your data",
  ]);
  await expect(
    page.getByRole("heading", { name: "iPhone (iOS 16.4 or later)" }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("the alert settings' deep link lands on the install heading", async ({
  page,
}) => {
  await page.goto("/about/install-alerts#install");
  await expect(page.locator("#install")).toBeInViewport();
});

test("the About submenu reaches the new section by keyboard", async ({
  page,
}) => {
  await page.goto("/about");
  const disclosure = page.locator("#about-disclosure");
  const summary = disclosure.locator("> summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(disclosure).toHaveAttribute("open", "");

  const entry = page
    .getByRole("navigation")
    .getByRole("link", { name: "Install & Alerts" });
  await expect(entry).toBeVisible();
  // The section is the second submenu entry: two Tabs land on it
  for (let i = 0; i < 2; i += 1) await page.keyboard.press("Tab");
  await expect(entry).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/about\/install-alerts$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Install & Alerts" }),
  ).toBeVisible();
});

test("the This-site page hands the steps over and the link lands there", async ({
  page,
}) => {
  await page.goto("/about");
  const link = page.getByRole("link", { name: "Install & Alerts" });
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/about\/install-alerts$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Install & Alerts" }),
  ).toBeVisible();
});

test("the page fits a mobile viewport without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/about/install-alerts");
  await expect(
    page.getByRole("heading", { level: 1, name: "Install & Alerts" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
