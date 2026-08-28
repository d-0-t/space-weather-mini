import { expect, test } from "@playwright/test";

test.use({
  viewport: { width: 390, height: 844 }, // iPhone-ish mobile viewport
});

test("home fits a mobile viewport without horizontal overflow", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
    timeout: 60_000,
  });
  // The header nav must not push the page wider than the viewport
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("collapses the nav into a hamburger that opens a full-screen panel", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
    timeout: 60_000,
  });

  // Wide-screen links are hidden; only the hamburger remains
  await expect(page.getByRole("link", { name: "About" })).toBeHidden();
  const toggle = page.getByRole("button", { name: /menu/i });
  await expect(toggle).toBeVisible();

  // Clicking opens the panel: full width, below the header, filling the viewport
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link", { name: "About" })).toBeVisible();
  const menuBox = await nav.getByRole("list").boundingBox();
  expect(menuBox).not.toBeNull();
  expect(menuBox!.width).toBe(390);
  expect(menuBox!.y).toBeGreaterThanOrEqual(60); // below the header
  expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(844);

  // A dimmed backdrop covers the page; tapping it closes the panel,
  // while tapping Details (which opens the submenu) keeps it open
  const backdrop = page.locator(".header__menu-backdrop");
  await expect(backdrop).toBeVisible();
  await page.getByRole("button", { name: "Details" }).click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await backdrop.click({ position: { x: 10, y: 10 } });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(nav.getByRole("link", { name: "About" })).toBeHidden();
  await expect(backdrop).toBeHidden();
});

test("tapping the panel background closes the menu, controls keep it open", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
    timeout: 60_000,
  });
  const toggle = page.getByRole("button", { name: /menu/i });
  await toggle.click();
  const details = page.getByRole("button", { name: "Details" });
  await details.click();
  await expect(details).toHaveAttribute("aria-expanded", "true");

  // A tap on empty panel space (below the items) closes the menu
  await page
    .locator(".header__menu")
    .click({ position: { x: 195, y: 720 } });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "About" }),
  ).toBeHidden();
});

test("daily indices table fits the viewport via internal scroll", async ({
  page,
}) => {
  await page.goto("/forecasts/daily");
  const table = page.getByRole("table");
  await expect(table).toBeVisible({ timeout: 60_000 });

  // The wide 28-column table must not push the page wider than the viewport
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // It scrolls inside its own region instead
  const region = page.locator(".daily-geomagnetic-indices__scroll");
  const sizes = await region.evaluate((el) => ({
    client: el.clientWidth,
    scroll: el.scrollWidth,
  }));
  expect(sizes.scroll).toBeGreaterThan(sizes.client);

  // The sticky date column stays pinned at the left while scrolled to the end
  await region.evaluate((el) => {
    el.scrollLeft = el.scrollWidth;
  });
  const dateBox = await table
    .locator("tbody tr:first-child td:first-child")
    .boundingBox();
  expect(dateBox).not.toBeNull();
  // Pinned at the left edge of the scroll region (container + card padding only)
  expect(dateBox!.x).toBeLessThanOrEqual(40);
});

test("Details opens inline inside the panel and Escape closes everything", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
    timeout: 60_000,
  });
  const toggle = page.getByRole("button", { name: /menu/i });
  await toggle.click();

  // Details is a collapsible disclosure – clicking opens the submenu inline
  const details = page.getByRole("button", { name: "Details" });
  await details.click();
  await expect(details).toHaveAttribute("aria-expanded", "true");
  const nav = page.getByRole("navigation");
  const submenu = nav.getByRole("list", { name: "Details submenu" });
  await expect(
    submenu.getByRole("link", { name: "Geophysical Alert" }),
  ).toBeVisible();
  const submenuBox = await submenu.boundingBox();
  expect(submenuBox).not.toBeNull();
  // Inline accordion: right-aligned under its trigger, fully inside the panel
  expect(submenuBox!.width).toBeGreaterThanOrEqual(200);
  expect(submenuBox!.x).toBeGreaterThanOrEqual(0);
  expect(submenuBox!.x + submenuBox!.width).toBeLessThanOrEqual(390);

  // Escape closes the submenu AND the panel, returning focus to the hamburger
  await page.keyboard.press("Escape");
  await expect(page.locator(".dropdown__trigger")).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(nav.getByRole("link", { name: "About" })).toBeHidden();
  await expect(toggle).toBeFocused();
});
