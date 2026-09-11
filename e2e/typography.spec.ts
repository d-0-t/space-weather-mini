import { expect, test, type Page, type Locator } from "@playwright/test";

// The stepped type scale (ADR-0009): sizes are token-driven and step at the
// canonical md Breakpoint (810px). 700px sits below it, 900px above.
const BELOW_MD = { width: 700, height: 900 };
const ABOVE_MD = { width: 900, height: 900 };

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

test("below md the type scale renders the mobile sizes", async ({ page }) => {
  await page.setViewportSize(BELOW_MD);
  await page.goto("/about");
  // body carries the body token: 0.95rem = 15.2px
  await expectFontSize(
    page,
    page.locator("body"),
    "15.2px",
  );
  // h1 2rem, h2 1.5rem – sized by the global element rules from the tokens
  await expectFontSize(
    page,
    page.getByRole("heading", { level: 1, name: "This site" }),
    "32px",
  );
  await expectFontSize(
    page,
    page.getByRole("heading", { level: 2, name: "Who am I?" }),
    "24px",
  );
  // h3 1.25rem = 20px on the sources subpage (no md step for h3/h4)
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
// the forecast pages): the same seam – computed styles at a width below and
// above the md Breakpoint, plus the below-sm fold for the panel titles.
const homePanelHeading = (page: Page) =>
  page.getByRole("heading", { level: 2, name: "Solar Wind" });
const webcamsTab = (page: Page) =>
  page.getByRole("tab", { name: "All cameras" });
const explainers = (page: Page) =>
  page.locator(".twenty-seven-day-outlook__explainers");
const placeFinderHeading = (page: Page) =>
  page.getByRole("heading", { name: "Change location" });
const timeModalNote = (page: Page) => page.locator(".time-dialog__note");

test("below md the migrated surfaces render the mobile token sizes", async ({
  page,
}) => {
  await page.setViewportSize(BELOW_MD);
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

test("above md the migrated surfaces render the stepped token sizes", async ({
  page,
}) => {
  await page.setViewportSize(ABOVE_MD);
  // Panel h2 steps with the global rule: 1.75rem = 28px
  await page.goto("/");
  await expectFontSize(page, homePanelHeading(page), "28px");
  // The Time modal note steps nowhere: small at every width. Below lg the
  // nav is the hamburger panel, so open it first.
  await page.getByRole("button", { name: /Open menu|Close menu/ }).click();
  await page.getByRole("button", { name: "Time (local)" }).click();
  await expectFontSize(page, timeModalNote(page).first(), "13.6px");
  await page.keyboard.press("Escape");
  // Webcams tabs and the forecast explainers carry the body token: 16px
  await page.goto("/webcams");
  await expectFontSize(page, webcamsTab(page), "16px");
  await page.goto("/forecasts/27days");
  await expectFontSize(page, explainers(page), "16px", 60_000);
  // The place finder modal heading steps with h2: 28px
  await page.goto("/conditions");
  await page.locator(".place-finder__trigger").click();
  await expectFontSize(page, placeFinderHeading(page), "28px");
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

test("at md h1, h2 and body step up to the desktop sizes", async ({ page }) => {
  await page.setViewportSize(ABOVE_MD);
  await page.goto("/about");
  // body 1rem = 16px
  await expectFontSize(page, page.locator("body"), "16px");
  // h1 steps 2rem → 2.5rem = 40px, h2 1.5rem → 1.75rem = 28px
  await expectFontSize(page, page.getByRole("heading", { level: 1, name: "This site" }), "40px");
  await expectFontSize(page, page.getByRole("heading", { level: 2, name: "Who am I?" }), "28px");
  // h3 stays 1.25rem = 20px (only body/lead/h1/h2 step)
  await page.goto("/about/sources");
  await expectFontSize(page, page.getByRole("heading", { level: 3, name: "Sources:" }), "20px");
  // The caption role steps nowhere: 0.75rem = 12px at every width
  await page.goto("/forecasts/3days");
  await expectFontSize(page, page.locator(".source-attribution").first(), "12px", 60_000);
});
