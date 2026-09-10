import { expect, test, type Page, type Locator } from "@playwright/test";

// The stepped type scale (ADR-0009): sizes are token-driven and step at the
// canonical md Breakpoint (810px). 700px sits below it, 900px above.
const BELOW_MD = { width: 700, height: 900 };
const ABOVE_MD = { width: 900, height: 900 };

// The About page carries the heading and body checks: its h1/h2 have no
// component-level sizing rules (home panel headings are em-chained and
// migrate in ticket 02), and it renders without any data fetch. The h3 and
// the caption-role attribution live on /about/sources and /forecasts/3days
// (3days needs the data timeout; sources renders instantly).
const computedFontSize = (page: Page, locator: Locator) =>
  locator.evaluate((el) => getComputedStyle(el).fontSize);

test("below md the type scale renders the mobile sizes", async ({ page }) => {
  await page.setViewportSize(BELOW_MD);
  await page.goto("/about");
  // body carries the body token: 0.95rem = 15.2px
  await expect
    .poll(async () => page.locator("body").evaluate((el) => getComputedStyle(el).fontSize))
    .toBe("15.2px");
  // h1 2rem, h2 1.5rem – sized by the global element rules from the tokens
  await expect
    .poll(async () =>
      computedFontSize(
        page,
        page.getByRole("heading", { level: 1, name: "This site" }),
      ),
    )
    .toBe("32px");
  await expect
    .poll(async () =>
      computedFontSize(
        page,
        page.getByRole("heading", { level: 2, name: "Who am I?" }),
      ),
    )
    .toBe("24px");
  // h3 1.25rem = 20px on the sources subpage (no md step for h3/h4)
  await page.goto("/about/sources");
  await expect
    .poll(async () =>
      computedFontSize(
        page,
        page.getByRole("heading", { level: 3, name: "Sources:" }),
      ),
    )
    .toBe("20px");
  // The caption role: source attributions render at 0.75rem = 12px
  await page.goto("/forecasts/3days");
  await expect
    .poll(
      async () =>
        computedFontSize(page, page.locator(".source-attribution").first()),
      { timeout: 60_000 },
    )
    .toBe("12px");
});

test("at md h1, h2 and body step up to the desktop sizes", async ({ page }) => {
  await page.setViewportSize(ABOVE_MD);
  await page.goto("/about");
  // body 1rem = 16px
  await expect
    .poll(async () => page.locator("body").evaluate((el) => getComputedStyle(el).fontSize))
    .toBe("16px");
  // h1 steps 2rem → 2.5rem = 40px, h2 1.5rem → 1.75rem = 28px
  await expect
    .poll(async () =>
      computedFontSize(
        page,
        page.getByRole("heading", { level: 1, name: "This site" }),
      ),
    )
    .toBe("40px");
  await expect
    .poll(async () =>
      computedFontSize(
        page,
        page.getByRole("heading", { level: 2, name: "Who am I?" }),
      ),
    )
    .toBe("28px");
  // h3 stays 1.25rem = 20px (only body/lead/h1/h2 step)
  await page.goto("/about/sources");
  await expect
    .poll(async () =>
      computedFontSize(
        page,
        page.getByRole("heading", { level: 3, name: "Sources:" }),
      ),
    )
    .toBe("20px");
  // The caption role steps nowhere: 0.75rem = 12px at every width
  await page.goto("/forecasts/3days");
  await expect
    .poll(
      async () =>
        computedFontSize(page, page.locator(".source-attribution").first()),
      { timeout: 60_000 },
    )
    .toBe("12px");
});
