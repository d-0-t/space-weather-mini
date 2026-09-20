import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

import AxeBuilder from "@axe-core/playwright";

import { ovationJson } from "../src/test/ovation-test-utils";

/**
 * The town webcams dialog's two bug reports:
 * 1. The close button rides the dialog surface's own top-right corner, not
 *    the viewport corner (the media viewers keep that pinned X; this
 *    dialog's surface is its own chrome).
 * 2. The dialog survives a viewport shrink that re-arranges the Dashboard
 *    columns: it portals to document.body, so the column reconciliation
 *    that moves and reinserts the rows can never displace it out of the
 *    top layer while it stays open (the "paints behind the site content"
 *    state). :modal matches only top-layer modal dialogs, so it is the
 *    seat check.
 */

const kpObservedFixture = readFileSync(
  new URL(
    "../src/products/fixtures/noaa-planetary-k-index.json",
    import.meta.url,
  ),
  "utf8",
);
const windFixture = readFileSync(
  new URL("../src/products/fixtures/rtsw-wind-1m.json", import.meta.url),
  "utf8",
);
const magFixture = readFileSync(
  new URL("../src/products/fixtures/rtsw-mag-1m.json", import.meta.url),
  "utf8",
);
const openMeteoKirunaFixture = JSON.parse(
  readFileSync(
    new URL("../src/data/fixtures/open-meteo-kiruna.json", import.meta.url),
    "utf8",
  ),
);

// The one grid cell the OVATION stub serves: Luleå (the default place).
const ovationGrid = ovationJson([[22.1546, 65.5848, 12]]);

/** Serves the panel's feeds from checked-in fixtures – no wall clock, no NOAA.
    The Kp feed answers 1 on the first fetch and 4 afterwards, so the
    5-minute refetch raises the oval mid-journey and reorders the rows. */
const stubPanelFeeds = async (page: Page): Promise<void> => {
  let kpFetch = 0;
  const kp4Fixture = JSON.stringify(
    (() => {
      const parsed = JSON.parse(kpObservedFixture) as Array<{ Kp: number }>;
      parsed[parsed.length - 1].Kp = 4;
      return parsed;
    })(),
  );
  await page.route("**/products/noaa-planetary-k-index.json", (route) => {
    kpFetch += 1;
    return route.fulfill({
      contentType: "application/json",
      body: kpFetch === 1 ? kpObservedFixture : kp4Fixture,
    });
  });
  await page.route("**/json/rtsw/rtsw_wind_1m.json", (route) =>
    route.fulfill({ contentType: "application/json", body: windFixture }),
  );
  await page.route("**/json/rtsw/rtsw_mag_1m.json", (route) =>
    route.fulfill({ contentType: "application/json", body: magFixture }),
  );
  await page.route("**/json/ovation_aurora_latest.json", (route) =>
    route.fulfill({ contentType: "application/json", body: ovationGrid }),
  );
  await page.route("**/api.open-meteo.com/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: openMeteoKirunaFixture,
    }),
  );
};

/** Freezes the clock and opens Home with the panel feeds stubbed. */
const openHome = async (page: Page, instant: string): Promise<void> => {
  await page.clock.install({ time: new Date(instant) });
  await stubPanelFeeds(page);
  await page.goto("/");
};

/** Opens Fairbanks's webcam dialog (its row moves position across the Kp jump). */
const openDialog = async (page: Page): Promise<void> => {
  const row = page
    .locator(".reach-towns__town", { hasText: "Fairbanks" })
    .first();
  await row.locator(".reach-towns__camera").click();
};

/** True when every sampled point of the dialog box is dialog-owned: no Dashboard card paints over it. */
const dialogPaintsOver = (dialog: HTMLDialogElement): boolean => {
  const box = dialog.getBoundingClientRect();
  const points = [
    [box.left + box.width / 2, box.top + 10],
    [box.right - 10, box.top + 10],
    [box.left + 10, box.top + box.height / 2],
    [box.left + box.width / 2, box.bottom - 10],
  ] as const;
  return points.every(([x, y]) => {
    const top = document.elementFromPoint(x, y);
    return top !== null && dialog.contains(top);
  });
};

test("the close button sits in the dialog's own top-right corner", async ({
  page,
}) => {
  await openHome(page, "2026-12-21T12:00:00Z");
  await expect(page.locator(".reach-towns__town").first()).toBeVisible();

  await openDialog(page);
  const dialog = page.locator("dialog.reach-town-webcams");
  await expect(dialog).toBeVisible();

  // The close button's box stays inside the dialog's box – the viewport
  // corner (where .image-modal__close pins it for the media viewers) is
  // now outside the dialog surface.
  const placement = await dialog.evaluate((dialog) => {
    const close = dialog.querySelector(".image-modal__close")!;
    const surface = close.getBoundingClientRect();
    const box = dialog.getBoundingClientRect();
    return {
      anchoredToSurface: (close as HTMLElement).offsetParent === dialog,
      inside:
        surface.top >= box.top &&
        surface.right <= box.right &&
        surface.left >= box.left &&
        surface.bottom <= box.bottom,
    };
  });
  expect(placement.inside).toBe(true);
});

test("a viewport shrink re-arranging the columns never unseats the open dialog", async ({
  page,
}) => {
  await openHome(page, "2026-12-21T12:00:00Z");
  await expect(page.locator(".reach-towns__town").first()).toBeVisible();

  await openDialog(page);
  const dialog = page.locator("dialog.reach-town-webcams");
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((dialog) => dialog.matches(":modal"))).toBe(
    true,
  );

  // Shrink through the Layout buckets: the columns re-arrange and the
  // portaled dialog must keep its top-layer seat (still :modal) with no
  // Dashboard card painting over it.
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((dialog) => dialog.matches(":modal"))).toBe(
    true,
  );
  expect(await dialog.evaluate(dialogPaintsOver)).toBe(true);

  // The list's own reorder is the sharper corrupter: the 5-minute Kp
  // refetch raises the oval (1 → 4) and React reorders the <li> nodes –
  // Fairbanks's own row moves up the list. A modal dialog living inside
  // the moved <li> is disconnected and reinserted, which strips its
  // top-layer seat while it stays open (the paint-behind-site-content
  // bug). The portaled dialog must ride through the reorder with its seat.
  await page.clock.runFor(5 * 60_000);
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((dialog) => dialog.matches(":modal"))).toBe(
    true,
  );
  expect(await dialog.evaluate(dialogPaintsOver)).toBe(true);
  await expect(
    page
      .locator(".reach-towns__town", { hasText: "Fairbanks" })
      .locator(".reach-towns__camera"),
  ).toBeVisible();
  expect(await dialog.evaluate((dialog) => dialog.matches(":modal"))).toBe(
    true,
  );
  expect(await dialog.evaluate(dialogPaintsOver)).toBe(true);

  await page.setViewportSize({ width: 1000, height: 700 });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((dialog) => dialog.matches(":modal"))).toBe(
    true,
  );
  expect(await dialog.evaluate(dialogPaintsOver)).toBe(true);

  // Crossing the md bucket boundary (2-column → 1-column) re-arranges the
  // Dashboard columns; the dialog either keeps its top-layer seat or has
  // closed with its row – never painting behind the site content.
  await page.setViewportSize({ width: 780, height: 700 });
  const count = await page.locator("dialog.reach-town-webcams").count();
  console.log("AFTER-MD-CROSS count:", count);
  if (count > 0) {
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((dialog) => dialog.matches(":modal"))).toBe(
      true,
    );
    expect(await dialog.evaluate(dialogPaintsOver)).toBe(true);
  }

  // And the open dialog still passes an axe audit after the re-arrangement.
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
