import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// A 1×1 transparent PNG served for every intercepted image request, so the
// gallery renders without any network dependency on the cam operators.
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * The webcams gallery is third-party imagery by design: every still, the
 * country flags and the Twitch player are stubbed so the journey asserts the
 * app's own DOM – alt text, titles, native controls, focus – not the network.
 */
const stubExternalMedia = async (page: Page): Promise<void> => {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.resourceType() === "document" && url.hostname.endsWith("twitch.tv")) {
      await route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><html><head><title>Twitch player</title></head><body></body></html>",
      });
      return;
    }
    if (request.resourceType() === "image") {
      await route.fulfill({ contentType: "image/png", body: PNG_1PX });
      return;
    }
    await route.continue();
  });
};

const openWebcams = async (page: Page): Promise<void> => {
  await stubExternalMedia(page);
  await page.goto("/webcams");
  await expect(
    page.getByRole("heading", { level: 1, name: "Webcams" }),
  ).toBeVisible();
};

const switchTo = async (page: Page, tab: string): Promise<void> => {
  await page.getByRole("tab", { name: tab }).click();
  await expect(page.getByRole("tab", { name: tab })).toHaveAttribute(
    "aria-selected",
    "true",
  );
};

test.describe("webcams gallery journey", () => {
  test("renders the full gallery with cards first, link rows after, honest alt text and a titled Twitch embed", async ({
    page,
  }) => {
    await openWebcams(page);
    await switchTo(page, "All cameras");

    // One image card per source, titled with station and latitude
    await expect(
      page.getByRole("heading", { level: 3, name: /Tromsø · 69\.6°N/ }),
    ).toBeVisible();
    // Every cam image carries the honest alt shape "… – current sky view"
    const altOk = await page
      .locator(".webcam-card__img")
      .evaluateAll((images) =>
        images.every(
          (img) =>
            img.getAttribute("alt") !== null &&
            img.getAttribute("alt")!.endsWith("current sky view"),
        ),
      );
    expect(altOk).toBe(true);

    // The Twitch embed is titled and never autoplays
    const twitch = page.getByTitle("Abisko (Lights over Lapland) – live on Twitch");
    await expect(twitch).toBeVisible();
    await expect(twitch).toHaveAttribute(
      "src",
      /channel=lightsoverlaplandlive.*autoplay=false&muted=true/,
    );

    // Link rows expose the station name as the link text and the kind note
    const linkRow = page.getByRole("link", { name: "Graham's AllSky – Wellington" });
    await expect(linkRow).toBeVisible();
    await expect(linkRow).toHaveAttribute("target", "_blank");
    await expect(
      page.locator(".webcam-link-row").filter({ has: linkRow }).getByText("Webcam"),
    ).toBeVisible();

    // Image cards render before the link rows – a wall of cams, not a list
    const order = await page.evaluate(() => {
      const cards = document.querySelectorAll(".webcam-card");
      const links = document.querySelectorAll(".webcam-link-row");
      if (cards.length === 0 || links.length === 0) return false;
      const lastCard = cards[cards.length - 1];
      const firstLink = links[0];
      return Boolean(
        lastCard.compareDocumentPosition(firstLink) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });
    expect(order).toBe(true);
  });

  test("drives the region filter with native checkbox chips, Select all and Deselect all", async ({
    page,
  }) => {
    await openWebcams(page);
    await switchTo(page, "My selection");

    // Filter opens by keyboard and its checklist holds one native checkbox
    // per region present in the registry
    const filter = page.getByRole("button", { name: /^Filter/ });
    await filter.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Filter webcams by region" });
    await expect(dialog).toBeVisible();
    const nordic = dialog.getByRole("checkbox", { name: "Nordic" });
    await expect(nordic).toBeVisible();
    await expect(nordic).toHaveAttribute("type", "checkbox");

    // The native chips and buttons are reachable in the keyboard order: the
    // dialog grabs focus on open (first chip), Tab walks through the rest,
    // then past the last chip into the action buttons
    const chipName = () =>
      page.evaluate(
        () => document.activeElement?.getAttribute("name") ?? "",
      );
    await expect.poll(chipName).toBe("Nordic");
    const reachable = new Set<string>([await chipName()]);
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("Tab");
      const name = await chipName();
      if (name) reachable.add(name);
    }
    expect(reachable).toEqual(
      new Set(["Nordic", "North America", "Russia", "UK", "rest"]),
    );
    await page.keyboard.press("Tab");
    await expect
      .poll(() =>
        page.evaluate(
          () => document.activeElement?.textContent?.trim() ?? "",
        ),
      )
      .toBe("Select all");

    // Checking a region narrows cards and link rows alike on Apply
    await nordic.check();
    await dialog.getByRole("button", { name: "Apply" }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("heading", { level: 3, name: /Tromsø · 69\.6°N/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 3, name: /Yellowknife/ }),
    ).toBeHidden();
    await expect(
      page.getByRole("link", { name: "Graham's AllSky – Wellington" }),
    ).toBeHidden();

    // Select all / Deselect all toggle the draft in one stroke; applying the
    // deselect restores the whole gallery. The button's accessible name is
    // its visible label – the applied count – not the tooltip.
    await page.getByRole("button", { name: "Filter (1)" }).click();
    await dialog.getByRole("button", { name: "Select all", exact: true }).click();
    for (const box of await dialog.getByRole("checkbox").all()) {
      await expect(box).toBeChecked();
    }
    await dialog.getByRole("button", { name: "Deselect all" }).click();
    for (const box of await dialog.getByRole("checkbox").all()) {
      await expect(box).not.toBeChecked();
    }
    await dialog.getByRole("button", { name: "Apply" }).click();
    await expect(
      page.getByRole("heading", { level: 3, name: /Yellowknife/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Graham's AllSky – Wellington" }),
    ).toBeVisible();
  });

  test("hides a source, lists it in the Hidden sources dialog and restores it with focus managed", async ({
    page,
  }) => {
    await openWebcams(page);
    await switchTo(page, "My selection");

    await page.getByRole("button", { name: "Hide Yellowknife" }).click();
    await expect(
      page.getByRole("heading", { level: 3, name: /Yellowknife/ }),
    ).toBeHidden();
    const hiddenButton = page.getByRole("button", {
      name: "Hidden sources (1)",
    });
    await hiddenButton.click();
    const dialog = page.getByRole("dialog", { name: "Hidden sources" });
    await expect(dialog).toBeVisible();
    // The name column lists the hidden entry (the Show button repeats the
    // name in its sr-only span, so scope to the column)
    await expect(
      dialog.locator(".webcams__hidden-name").filter({ hasText: "Yellowknife" }),
    ).toBeVisible();

    // Escape closes the native dialog and returns focus to its trigger
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(hiddenButton).toBeFocused();

    // One-tap restore brings the card back and the count stays live
    await hiddenButton.click();
    await dialog.getByRole("button", { name: "Show Yellowknife" }).click();
    await expect(
      page.getByRole("heading", { level: 3, name: /Yellowknife/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Hidden sources (0)" }),
    ).toBeVisible();
  });

  test("offers auto-refresh as a native checkbox, off by default, persisted across reloads", async ({
    page,
  }) => {
    await openWebcams(page);
    const autoRefresh = page.getByRole("checkbox", { name: /auto-refresh/i });
    await expect(autoRefresh).toBeVisible();
    await expect(autoRefresh).not.toBeChecked();
    await expect(autoRefresh).toHaveAttribute("type", "checkbox");

    await autoRefresh.check();
    await expect(autoRefresh).toBeChecked();
    await page.reload();
    await expect(
      page.getByRole("checkbox", { name: /auto-refresh/i }),
    ).toBeChecked();
  });

  test("passes the axe audit on the full gallery", async ({ page }) => {
    await openWebcams(page);
    await switchTo(page, "All cameras");
    await expect(
      page.getByRole("heading", { level: 3, name: /Tromsø · 69\.6°N/ }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe("webcams narrow layout", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("fits a mobile viewport: no overflow, cards stack and the filter dialog fits", async ({
    page,
  }) => {
    await openWebcams(page);
    await switchTo(page, "All cameras");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // Cards stack in a single column – every card spans the full row width
    const firstCard = page.locator(".webcam-card").first();
    await expect(firstCard).toBeVisible();
    const box = await firstCard.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(340);

    // Toolbar pills wrap instead of overflowing the narrow viewport
    await switchTo(page, "My selection");
    const toolbar = page.locator(".webcams__toolbar");
    const refreshBox = await toolbar
      .getByRole("button", { name: "Refresh" })
      .boundingBox();
    const autoRefreshBox = await toolbar
      .getByRole("checkbox", { name: /auto-refresh/i })
      .boundingBox();
    expect(refreshBox).not.toBeNull();
    expect(autoRefreshBox).not.toBeNull();
    expect(autoRefreshBox!.y).toBeGreaterThan(refreshBox!.y);

    // The filter dialog stays inside the viewport
    await page.getByRole("button", { name: /^Filter/ }).click();
    const dialog = page.getByRole("dialog", { name: "Filter webcams by region" });
    await expect(dialog).toBeVisible();
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(390);
    expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(844);
  });
});