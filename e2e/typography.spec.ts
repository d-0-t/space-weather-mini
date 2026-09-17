import { expect, test, type Page, type Locator } from "@playwright/test";

// The type scale (ADR-0009): sizes are token-driven and identical at every
// width – no breakpoint step. 1000px and 1150px assert the same tokens.
const BELOW_LG = { width: 1000, height: 900 };
const ABOVE_LG = { width: 1150, height: 900 };

// The About page carries the heading and body checks: it renders without
// any data fetch and its h1/h2 have no component-level sizing rules. The h3
// and the caption-role attribution live on /about/sources and
// /forecasts/3days (3days needs the data timeout; sources renders instantly).
const computedFontSize = (page: Page, locator: Locator) =>
  locator.evaluate((el) => getComputedStyle(el).fontSize);

// One poll-per-assertion shape for every computed-size check in the file.
const expectFontSize = (
  page: Page,
  locator: Locator,
  px: string,
  timeout = 5_000,
) =>
  expect
    .poll(async () => computedFontSize(page, locator), { timeout })
    .toBe(px);

test("below lg the type scale renders the base sizes", async ({ page }) => {
  await page.setViewportSize(BELOW_LG);
  await page.goto("/about");
  // body carries the body token: 0.95rem = 15.2px
  await expectFontSize(
    page,
    page.locator("body"),
    "15.2px",
  );
  // h1 1.75rem = 28px, h2 1.5rem = 24px – sized by the global element rules
  await expectFontSize(
    page,
    page.getByRole("heading", { level: 1, name: "This site" }),
    "28px",
  );
  await expectFontSize(
    page,
    page.getByRole("heading", { level: 2, name: "Who am I?" }),
    "24px",
  );
  // h3 1.25rem = 20px on the sources subpage (no lg step for h3/h4)
  await page.goto("/about/sources");
  await expectFontSize(
    page,
    page.getByRole("heading", { level: 3, name: "Sources:" }),
    "20px",
  );
  // The caption role: source attributions render at 0.75rem = 12px
  await page.goto("/forecasts/3days");
  await expectFontSize(
    page,
    page.locator(".source-attribution").first(),
    "12px",
    60_000,
  );
});

// Ticket 02 surfaces (navigation, shared components, conditions, webcams and
// the forecast pages): the same seam – computed styles at a narrow and a
// wide viewport, plus the below-sm fold for the panel titles.
const homePanelHeading = (page: Page) =>
  page.getByRole("heading", { level: 2, name: "Solar Wind" });
const webcamsTab = (page: Page) =>
  page.getByRole("tab", { name: "All cameras" });
const explainers = (page: Page) =>
  page.locator(".twenty-seven-day-outlook__explainers");
const placeFinderHeading = (page: Page) =>
  page.getByRole("heading", { name: "Change location" });
const timeModalNote = (page: Page) => page.locator(".time-dialog__note");

test("below lg the migrated surfaces render the base token sizes", async ({
  page,
}) => {
  await page.setViewportSize(BELOW_LG);
  // Home panel headings: sized by the global h2 element rules (1.5rem = 24px)
  await page.goto("/");
  await expectFontSize(page, homePanelHeading(page), "24px");
  // The Time modal's explanatory note: the small token (0.85rem = 13.6px).
  // Below lg the nav is the hamburger panel, so open it first.
  await page.getByRole("button", { name: /Open menu|Close menu/ }).click();
  await page.getByRole("button", { name: "Time (local)" }).click();
  await expectFontSize(page, timeModalNote(page).first(), "13.6px");
  await page.keyboard.press("Escape");
  // Webcams view tabs: the body token (0.95rem = 15.2px)
  await page.goto("/webcams");
  await expectFontSize(page, webcamsTab(page), "15.2px");
  // The place finder modal heading: the global h2 element rules (24px)
  await page.goto("/conditions");
  await page.locator(".place-finder__trigger").click();
  await expectFontSize(page, placeFinderHeading(page), "24px");
  await page.keyboard.press("Escape");
  // The forecast explainers line: the body token (15.2px), data timed out
  // tolerantly like the other data-dependent checks
  await page.goto("/forecasts/27days");
  await expectFontSize(page, explainers(page), "15.2px", 60_000);
});

test("above lg the migrated surfaces render the same base token sizes", async ({
  page,
}) => {
  await page.setViewportSize(ABOVE_LG);
  // Panel h2 keeps the base size: 1.5rem = 24px
  await page.goto("/");
  await expectFontSize(page, homePanelHeading(page), "24px");
  // The Time modal note steps nowhere: small at every width. At lg and up
  // the wide nav bar carries the Time button directly.
  await page.getByRole("button", { name: "Time (local)" }).click();
  await expectFontSize(page, timeModalNote(page).first(), "13.6px");
  await page.keyboard.press("Escape");
  // Webcams tabs and the forecast explainers carry the body token: 15.2px
  await page.goto("/webcams");
  await expectFontSize(page, webcamsTab(page), "15.2px");
  await page.goto("/forecasts/27days");
  await expectFontSize(page, explainers(page), "15.2px", 60_000);
  // The place finder modal heading keeps the h2 size: 24px
  await page.goto("/conditions");
  await page.locator(".place-finder__trigger").click();
  await expectFontSize(page, placeFinderHeading(page), "24px");
});

test("below sm the panel titles step down (the 419px fold)", async ({
  page,
}) => {
  // Very narrow screens: the longest panel name plus the chevron exceeds the
  // toggle, so the title steps to the h3 token below the sm Breakpoint
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/");
  await expectFontSize(page, homePanelHeading(page), "20px");
});

test("at lg h1, h2 and body keep the base sizes", async ({ page }) => {
  await page.setViewportSize(ABOVE_LG);
  await page.goto("/about");
  // body 0.95rem = 15.2px
  await expectFontSize(page, page.locator("body"), "15.2px");
  // h1 1.75rem = 28px, h2 1.5rem = 24px
  await expectFontSize(page, page.getByRole("heading", { level: 1, name: "This site" }), "28px");
  await expectFontSize(page, page.getByRole("heading", { level: 2, name: "Who am I?" }), "24px");
  // h3 stays 1.25rem = 20px (no breakpoint step anywhere)
  await page.goto("/about/sources");
  await expectFontSize(page, page.getByRole("heading", { level: 3, name: "Sources:" }), "20px");
  // The caption role steps nowhere: 0.75rem = 12px at every width
  await page.goto("/forecasts/3days");
  await expectFontSize(page, page.locator(".source-attribution").first(), "12px", 60_000);
});
