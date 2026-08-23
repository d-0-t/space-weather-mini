import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const SHELL_NODES = new Set(["html", "center"]);

test("the explainers page renders", async ({ page }) => {
  await page.goto("/explainers");
  await expect(page.getByRole("heading", { level: 1, name: "Explainers" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Kp index" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Aurora forecast" })).toBeVisible();
  // Each explainer section is linkable via its anchor
  await expect(page.locator("#kp-index")).toBeVisible();
  await expect(page.locator("#aurora-forecast")).toBeVisible();
  // Navigation link to explainers is present on every page
  await expect(page.getByRole("link", { name: "Explainers" })).toBeVisible();
});

test("the explainers page passes the axe audit", async ({ page }) => {
  await page.goto("/explainers");
  await expect(page.getByRole("heading", { level: 1, name: "Explainers" })).toBeVisible();

  const results = await new AxeBuilder({ page }).exclude("#header, #footer").analyze();
  const pageViolations = results.violations.filter(
    (violation) =>
      !violation.nodes.every(
        (node) =>
          node.target.length === 1 &&
          typeof node.target[0] === "string" &&
          SHELL_NODES.has(node.target[0]),
      ),
  );
  expect(pageViolations).toEqual([]);
});

test("product pages link into the explainers glossary", async ({ page }) => {
  await page.goto("/forecasts/27days");
  await expect(page.getByRole("link", { name: /radio flux/i })).toBeVisible();
  await page.goto("/forecasts/daily");
  await expect(page.getByRole("link", { name: /kp index/i }).first()).toBeVisible();
  await page.goto("/forecasts/3days");
  await expect(page.getByRole("link", { name: /geomagnetic activity/i })).toBeVisible();
  await page.goto("/forecasts/discussion");
  await expect(page.getByRole("link", { name: /geospace/i })).toBeVisible();
});
