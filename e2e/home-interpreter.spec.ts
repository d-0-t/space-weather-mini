import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

import AxeBuilder from "@axe-core/playwright";

import { ovationJson } from "../src/test/ovation-test-utils";

/**
 * The interpreter panel's Home journey (plain-language ticket 08): the
 * built app renders the summary from live-shape feeds, the time-ahead
 * selector is keyboard-operable, the View distance line's daylight gate
 * names the light instead of a band in a bright sky, the panel passes an
 * axe audit and survives the narrow layout. The Vitest suites pin the
 * sentences; this spec proves the shipped bundle end to end.
 *
 * Seams under test (DOM only, no internals): `.aurora-now__summary__text`
 * paragraph text, the accessible `Time` selector and its option labels,
 * `.view-distance__probability__location__text`, page overflow at 390px,
 * and the axe result. Every journey pins the device clock and serves
 * checked-in or live-shape fixtures, so nothing depends on the wall clock
 * or NOAA's mood.
 */

// The real observed Kp fixture (latest block Kp 1.0 → the calm sentence).
const kpObservedFixture = readFileSync(
  new URL(
    "../src/products/fixtures/noaa-planetary-k-index.json",
    import.meta.url,
  ),
  "utf8",
);

// The real Open-Meteo Kiruna payload, so the weather line renders offline.
const openMeteoKirunaFixture = JSON.parse(
  readFileSync(
    new URL("../src/data/fixtures/open-meteo-kiruna.json", import.meta.url),
    "utf8",
  ),
);

// The one grid cell the OVATION stub serves: Luleå (the default place),
// intensity 12 – a qualifying `>= 6` cell on the place itself.
const ovationGrid = ovationJson([[22.1546, 65.5848, 12]]);

/** The freshest L1 readings, matching the checked-in fixtures' date. */
const LATEST_WIND_TAG = "2026-08-26T23:26:07";
const LATEST_MAG_TAG = "2026-08-26T23:26:01";

/**
 * Live-shape RTSW rails: 121 one-minute rows ending at the freshest
 * reading, exactly the real feed's shape (the checked-in fixtures cover
 * only 30 minutes, shorter than the ~89 min transit the summary reads
 * through). Speed 280.85 km/s and density 8.3 sit in the slow/thin bands;
 * the field is weakly right (−2 nT) at the arriving-now instant and moves
 * strongly right (−15 nT) for measurements that arrive later, so the
 * time-ahead selector visibly changes the merged L1 sentence.
 */
const windFixture = JSON.stringify(
  Array.from({ length: 121 }, (_, i) => ({
    time_tag: new Date(
      Date.parse(`${LATEST_WIND_TAG}Z`) - (120 - i) * 60_000,
    )
      .toISOString()
      .slice(0, 19),
    proton_speed: 280.85,
    proton_density: 8.3,
    source: "IMAP",
  })),
);
const magFixture = JSON.stringify(
  Array.from({ length: 121 }, (_, i) => {
    const ms = Date.parse(`${LATEST_MAG_TAG}Z`) - (120 - i) * 60_000;
    // The arriving-now measurement sits 89 min behind the freshest; the
    // −15 nT stretch starts 28 min after it, so the ±2.5 min averages
    // around "now" and "in 30 min" each land fully inside one band.
    const arrivingNowMs = Date.parse(`${LATEST_MAG_TAG}Z`) - 89 * 60_000;
    return {
      time_tag: new Date(ms).toISOString().slice(0, 19),
      bt: 3,
      bz_gsm: ms < arrivingNowMs + 28 * 60_000 ? -2 : -15,
    };
  }),
);

/** Serves the interpreter's four feeds plus weather from fixtures. */
const stubInterpreterFeeds = async (page: Page): Promise<void> => {
  await page.route("**/products/noaa-planetary-k-index.json", (route) =>
    route.fulfill({ contentType: "application/json", body: kpObservedFixture }),
  );
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

/** Freezes the clock and opens Home with the interpreter feeds stubbed. */
const openInterpreter = async (
  page: Page,
  instant = "2026-08-26T23:30:00Z",
): Promise<void> => {
  await page.clock.install({ time: new Date(instant) });
  await stubInterpreterFeeds(page);
  await page.goto("/");
};

test("the interpreter panel renders on Home from live-shape feeds", async ({
  page,
}) => {
  await openInterpreter(page);

  const summary = page.locator(".aurora-now__summary__text");
  await expect(summary).toContainText(
    "Aurora intensity is currently low",
  );
  await expect(summary).toContainText("running slow and thin");
  await expect(summary).toContainText("leans weakly toward aurora");
  // The reach sentence (OVATION stub cell on Luleå) and the one guide link.
  await expect(summary).toContainText("Nearest glow 0-100 km away (Likely).");
  await expect(page.getByRole("link", { name: /read aurora guide/i })).toHaveAttribute(
    "href",
    "/about/guide",
  );
});

test("the time-ahead selector is keyboard-operable and drives the L1 sentence", async ({
  page,
}) => {
  await openInterpreter(page);

  const select = page.getByRole("combobox", { name: "Time" });
  await expect(select).toBeVisible();
  // Speed 280.85 km/s → an 89 min transit; the offered offsets step to it.
  await expect(select.locator("option")).toHaveText([
    "Now – faint",
    "In 15 min – faint",
    "In 30 min – moderate",
    "In 89 min (latest) – moderate",
  ]);

  // Keyboard path: focus the native select and step it with arrow keys.
  await select.focus();
  await expect(select).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(select).toHaveValue("15");
  await page.keyboard.press("ArrowDown");
  await expect(select).toHaveValue("30");
  // The reading arriving in 30 min carries the −15 nT field: strongly right.
  await expect(page.locator(".aurora-now__summary__text")).toContainText(
    "pushing hard",
  );
  await page.keyboard.press("ArrowUp");
  await expect(select).toHaveValue("15");
  await expect(page.locator(".aurora-now__summary__text")).toContainText(
    "leans weakly toward aurora",
  );
});

/**
 * The daylight gate: at 65°N on 2026-08-26 the sun is well up at 12:00
 * local (10:00Z), sits just below the horizon at 20:20 local (18:20Z) and
 * is far below it at 01:30 local (23:30Z). The View distance line names
 * the light instead of a band whenever the sky is too bright.
 */
const LIGHT_STATES = [
  { instant: "2026-08-26T10:00:00Z", label: "Daytime", showsBand: false },
  {
    instant: "2026-08-26T18:20:00Z",
    label: "Civil twilight",
    showsBand: false,
  },
  { instant: "2026-08-26T23:30:00Z", label: "Aurora likely", showsBand: true },
] as const;

for (const { instant, label, showsBand } of LIGHT_STATES) {
  test(`the daylight gate reads "${label}" at ${instant}`, async ({ page }) => {
    await openInterpreter(page, instant);

    const line = page.locator(".view-distance__probability__location__text");
    await expect(line).toContainText(label);
    if (!showsBand) {
      // A bright sky never reads an aurora band.
      await expect(line).not.toContainText("Aurora");
    }
  });
}

test("the interpreter panel passes an axe audit", async ({ page }) => {
  await openInterpreter(page);
  await expect(page.locator(".aurora-now__summary__text")).toContainText(
    "running slow and thin",
  );
  const results = await new AxeBuilder({ page }).include(".aurora-now").analyze();
  expect(results.violations).toEqual([]);
});

test.describe("the interpreter panel at a narrow width", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("fits the viewport without horizontal overflow", async ({ page }) => {
    await openInterpreter(page);

    await expect(page.locator(".aurora-now__summary__text")).toContainText(
      "running slow and thin",
    );
    await expect(page.getByRole("combobox", { name: "Time" })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const panel = await page.locator(".aurora-now__summary").boundingBox();
    expect(panel).not.toBeNull();
    expect(panel!.x).toBeGreaterThanOrEqual(0);
    expect(panel!.x + panel!.width).toBeLessThanOrEqual(390);
  });
});
