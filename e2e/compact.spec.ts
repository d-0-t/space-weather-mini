// Feedback loop for the ticket-05 follow-up: "at some screen sizes the
// Compact toggling does not do anything". Drives the real Dashboard layout
// in a real browser at three widths and asserts the user's exact symptom:
// flipping one panel's Compact checkbox must visibly change that panel's
// rendered height (densify = shorter panel), and must not move the others.
import { expect, test, type Page } from "@playwright/test";

const articleHeight = (page: Page, heading: RegExp): Promise<number> =>
  page
    .getByRole("heading", { name: heading })
    .evaluate((h) => h.closest("article")!.getBoundingClientRect().height);

const compactToggle = (page: Page, heading: RegExp) =>
  page
    .locator(".collapsible-panel__head", {
      has: page.getByRole("heading", { name: heading }),
    })
    .getByRole("checkbox", { name: "Compact" });

/** Distinct visual rows the matching cards sit in (4px buckets). */
const cardRows = (page: Page, cardSelector: string): Promise<number> =>
  page.evaluate((sel) => {
    const tops = [...document.querySelectorAll(sel)].map((el) =>
      Math.round(el.getBoundingClientRect().top / 4),
    );
    return new Set(tops).size;
  }, cardSelector);

async function gotoDashboard(page: Page, width: number): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByRole("heading", { name: /^Solar wind$/i }),
  ).toBeVisible({ timeout: 60_000 });
  // The panel heading renders immediately with a Loading body; wait for the
  // four live cards so row/height reads compare toggle vs toggle, not
  // feed-vs-feed.
  await expect(page.locator(".solar-wind .live-panel__card")).toHaveCount(4, {
    timeout: 60_000,
  });
  // Live charts reserve their height up front, but give fonts and the first
  // feed paint a beat so the two height reads compare toggle vs toggle.
  await page.waitForTimeout(1500);
}

test.describe("Per-panel Compact visibly densifies (ticket 05 follow-up)", () => {
  for (const width of [500, 1000, 1700]) {
    test(`Solar wind Compact shrinks its own panel at ${width}px`, async ({
      page,
    }) => {
      await gotoDashboard(page, width);
      // Roomy stacks one card per row; Compact puts them 2 by side.
      expect(await cardRows(page, ".solar-wind .live-panel__card")).toBe(4);
      const before = await articleHeight(page, /^Solar wind$/i);
      const magBefore = await articleHeight(page, /Magnetosphere/);

      await compactToggle(page, /^Solar wind$/i).click();

      expect(await cardRows(page, ".solar-wind .live-panel__card")).toBe(2);
      const after = await articleHeight(page, /^Solar wind$/i);
      const magAfter = await articleHeight(page, /Magnetosphere/);
      // Densify must be visible: the owning panel gets shorter by more than
      // a rounding wobble, while the sibling panel does not move.
      expect(after).toBeLessThan(before - 2);
      expect(Math.abs(magAfter - magBefore)).toBeLessThanOrEqual(2);
    });
  }

  test("Pinned webcams Compact lays two pins side by side at 1000px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem(
        "sw:webcams:pins:v1",
        JSON.stringify({ v: 1, pins: ["irf-kiruna", "uaf-poker-flat"] }),
      );
    });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByRole("heading", { name: /Pinned webcams/ }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      page.locator(".pinned-webcams .pinned-webcam-card"),
    ).toHaveCount(2, { timeout: 60_000 });
    await page.waitForTimeout(1500);

    // Roomy stacks the two pins; Compact lays them side by side.
    expect(
      await cardRows(page, ".pinned-webcams .pinned-webcam-card"),
    ).toBe(2);
    const before = await articleHeight(page, /Pinned webcams/);
    await compactToggle(page, /Pinned webcams/).click();
    expect(await cardRows(page, ".pinned-webcams .pinned-webcam-card")).toBe(
      1,
    );
    const after = await articleHeight(page, /Pinned webcams/);
    expect(after).toBeLessThan(before - 2);
  });
});
