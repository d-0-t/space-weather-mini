import { expect, test } from "@playwright/test";

test.use({
  viewport: { width: 390, height: 844 }, // iPhone-ish mobile viewport
});

test("home fits a mobile viewport without horizontal overflow", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible({
    timeout: 60_000,
  });
  // The header nav must not push the page wider than the viewport
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  // Every nav item is reachable (wrapped, not clipped)
  for (const label of ["Home", "About", "Explainers"]) {
    await expect(page.getByRole("link", { name: label })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Details" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Astro mode" }),
  ).toBeVisible();
  // The Details submenu still opens on mobile
  await page.getByRole("button", { name: "Details" }).click();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Geophysical Alert" }),
  ).toBeVisible();
});