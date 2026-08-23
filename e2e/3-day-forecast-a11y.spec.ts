import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const dataTimeout = 60_000;

// Document-level shell violations tracked by ticket 11 (app shell
// accessibility): the app has no <main> landmark, and the shared <center>
// wrapper sits outside landmarks. Both attach to <html>/<center> — not to page
// content — so we tolerate exactly those nodes and nothing else. A violation
// on any other element still fails the audit.
const SHELL_NODES = new Set(["html", "center"]);

test("the 3-day forecast page passes the axe audit", async ({ page }) => {
  await page.goto("/forecasts/3days");
  await expect(page.getByRole("table").first()).toBeVisible({ timeout: dataTimeout });

  const results = await new AxeBuilder({ page })
    .exclude("#header, #footer")
    .analyze();
  const pageViolations = results.violations.filter(
    (violation) =>
      !violation.nodes.every(
        (node) =>
          node.target.length === 1 &&
          typeof node.target[0] === "string" &&
          SHELL_NODES.has(node.target[0])
      )
  );
  expect(pageViolations).toEqual([]);
});