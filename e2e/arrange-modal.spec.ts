import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const dataTimeout = 60_000;

const dialog = (page: Page) => page.locator("dialog.arrange-dialog");

const openArrange = async (page: Page) => {
  await page.getByRole("button", { name: "Rearrange" }).click();
  await expect(dialog(page)).toBeVisible();
};

const row = (page: Page, label: string) =>
  dialog(page)
    .locator(".arrange-dialog__row")
    .filter({ has: page.locator(".arrange-dialog__row-label", { hasText: label }) });

const apply = async (page: Page) => {
  await dialog(page).getByRole("button", { name: "Apply" }).click();
  await expect(dialog(page)).not.toBeVisible();
};

test.describe("Arrange modal (dashboard-layout ticket 07)", () => {
  test("opens from the Dashboard header with the three bucket tabs and passes axe with the dialog open", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeVisible({ timeout: dataTimeout });
    await expect(dialog(page)).toHaveCount(0);

    await openArrange(page);
    const tablist = page.getByRole("tablist", { name: "Layout buckets" });
    await expect(tablist.getByRole("tab", { name: "1-column" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    await expect(
      tablist.getByRole("tab", { name: "2-column" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByRole("list", { name: "Column A" }),
    ).toContainText("Aurora now");

    // The copy explains the bucket switching and the two conditional panels.
    await expect(dialog(page)).toContainText(/screen or window size/i);
    await expect(row(page, "Pinned webcams")).toContainText(
      "Only shown if you have",
    );
    await expect(
      row(page, "Pinned webcams").getByRole("link", { name: "pinned webcams" }),
    ).toHaveAttribute("href", "/webcams");
    await expect(row(page, "Possible locations")).toContainText(
      "Only shown when the aurora is strong enough",
    );

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("the modal uses the viewport on small screens and a roomy width on big ones", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1650, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeVisible({ timeout: dataTimeout });
    await openArrange(page);
    // The roomy card: 60rem = 960px, clearly more than the old 40rem cap.
    const wideBox = await dialog(page).boundingBox();
    expect(wideBox!.width).toBeGreaterThanOrEqual(900);

    await page.setViewportSize({ width: 700, height: 900 });
    const smallBox = await dialog(page).boundingBox();
    expect(smallBox!.width).toBeLessThanOrEqual(640);
    await page.keyboard.press("Escape");
  });

  test("the multi-column tabs mirror the Dashboard's column fractions at wide viewports", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1650, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeVisible({ timeout: dataTimeout });
    await openArrange(page);
    // xl opens on the 3-column bucket: columns A/B/C split 1 : 2 : 1.5.
    const columns = page.locator(".arrange-dialog__column");
    await expect(columns).toHaveCount(3);
    const boxes = await Promise.all(
      [0, 1, 2].map((i) => columns.nth(i).boundingBox()),
    );
    expect(boxes[1]!.width / boxes[0]!.width).toBeGreaterThan(1.9);
    expect(boxes[1]!.width / boxes[0]!.width).toBeLessThan(2.1);
    expect(boxes[2]!.width / boxes[0]!.width).toBeGreaterThan(1.4);
    expect(boxes[2]!.width / boxes[0]!.width).toBeLessThan(1.6);

    // The 2-column tab splits its lists 1 : 2.
    await dialog(page).getByRole("tab", { name: "2-column" }).click();
    const pairBoxes = await Promise.all(
      [0, 1].map((i) => columns.nth(i).boundingBox()),
    );
    expect(pairBoxes[1]!.width / pairBoxes[0]!.width).toBeGreaterThan(1.9);
    expect(pairBoxes[1]!.width / pairBoxes[0]!.width).toBeLessThan(2.1);
    await page.keyboard.press("Escape");
  });

  test("the multi-column tabs wrap when the viewport cannot fit the columns", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 500, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeVisible({ timeout: dataTimeout });
    await openArrange(page);
    await dialog(page).getByRole("tab", { name: "3-column" }).click();
    const columns = page.locator(".arrange-dialog__column");
    await expect(columns).toHaveCount(3);
    // Each column takes its own line: tops strictly increase.
    const boxes = await Promise.all(
      [0, 1, 2].map((i) => columns.nth(i).boundingBox()),
    );
    expect(boxes[0]!.y).toBeLessThan(boxes[1]!.y);
    expect(boxes[1]!.y).toBeLessThan(boxes[2]!.y);
    await page.keyboard.press("Escape");
  });

  test("Apply commits a button move, the live Dashboard re-renders and it persists across a reload", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 700, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeVisible({ timeout: dataTimeout });
    const h2Order = async () => page.locator(".home__flow h2").allTextContents();
    // Precondition: Magnetosphere above Forecast in the default order.
    let names = await h2Order();
    expect(names.indexOf("Magnetosphere")).toBeLessThan(
      names.indexOf("Forecast"),
    );

    await openArrange(page);
    await row(page, "Forecast")
      .getByRole("button", { name: "Move Forecast up" })
      .click();
    await apply(page);

    names = await h2Order();
    expect(names.indexOf("Forecast")).toBeLessThan(
      names.indexOf("Magnetosphere"),
    );

    // The next visit keeps the arrangement.
    await page.reload();
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeVisible({ timeout: dataTimeout });
    names = await h2Order();
    expect(names.indexOf("Forecast")).toBeLessThan(
      names.indexOf("Magnetosphere"),
    );
  });

  test("Cancel and Escape discard every edit", async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeVisible({ timeout: dataTimeout });
    const h2Order = async () => page.locator(".home__flow h2").allTextContents();

    await openArrange(page);
    await row(page, "Forecast")
      .getByRole("button", { name: "Move Forecast up" })
      .click();
    await dialog(page).getByRole("button", { name: "Cancel" }).click();
    await expect(dialog(page)).not.toBeVisible();
    let names = await h2Order();
    expect(names.indexOf("Magnetosphere")).toBeLessThan(
      names.indexOf("Forecast"),
    );

    await openArrange(page);
    await row(page, "Forecast")
      .getByRole("button", { name: "Move Forecast up" })
      .click();
    await page.keyboard.press("Escape");
    await expect(dialog(page)).not.toBeVisible();
    names = await h2Order();
    expect(names.indexOf("Magnetosphere")).toBeLessThan(
      names.indexOf("Forecast"),
    );
  });

  test("arrow keys move panels between columns", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeVisible({ timeout: dataTimeout });

    await openArrange(page);
    // The modal opens on the live 2-column bucket at this width.
    const summaryRow = row(page, "Summary");
    await summaryRow.click();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("list", { name: "Column B" })).toContainText(
      "Summary",
    );
    await expect(page.getByRole("list", { name: "Column A" })).not.toContainText(
      "Summary",
    );
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("list", { name: "Column A" })).toContainText(
      "Summary",
    );
    await apply(page);

    // The returned Summary now sits at the end of column A on the live page.
    const names = await page.locator(".home__flow h2").allTextContents();
    expect(names.indexOf("Oval glow")).toBeLessThan(names.indexOf("Summary"));
    expect(names.indexOf("Forecast")).toBeLessThan(names.indexOf("Summary"));
  });

  test("mouse drag reorders within the 1-column list", async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeVisible({ timeout: dataTimeout });

    await openArrange(page);
    await page
      .locator(".arrange-dialog__row")
      .filter({ hasText: "Forecast" })
      .dragTo(
        page
          .locator(".arrange-dialog__row")
          .filter({ hasText: "Aurora now" }),
      );
    await expect(dialog(page).locator(".arrange-dialog__row-label").first())
      .toHaveText("Forecast");
    await apply(page);
    await expect(page.locator(".home__flow h2").first()).toHaveText("Forecast");

    // Reset-to-default restores the agreed defaults through Apply.
    await openArrange(page);
    await dialog(page)
      .getByRole("button", { name: "Reset to default" })
      .click();
    await expect(dialog(page).locator(".arrange-dialog__row-label").first())
      .toHaveText("Aurora now");
    await apply(page);
    await expect(page.locator(".home__flow h2").first()).toHaveText(
      "Aurora now",
    );
    await expect(page.locator(".home__flow h2").last()).toHaveText("Forecast");
  });
});
