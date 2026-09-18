import { describe, expect, it } from "vitest";

import lockJson from "./package-lock.json";
import packageJson from "./package.json";

/**
 * Netlify-only deploy contract (background-alerts ticket 01): pushing the
 * repo must update the Netlify site and nothing else. The `gh-pages` static
 * mirror is gone, so there is exactly one URL where background alerts work.
 * This pins the `package.json`/`package-lock.json` seam — the path any
 * second hosting target must pass through (deploy scripts, the `gh-pages`
 * dependency, and the Create-React-App `homepage` leftover that named a
 * deploy target).
 */
describe("Netlify-only deploy contract", () => {
  it("has no second hosting target in scripts", () => {
    const scripts = packageJson.scripts as Record<string, string> | undefined;
    expect(scripts?.["predeploy"]).toBeUndefined();
    expect(scripts?.["deploy"]).toBeUndefined();
  });

  it("has no gh-pages dependency", () => {
    const dependencies = packageJson.dependencies as
      | Record<string, string>
      | undefined;
    const devDependencies = packageJson.devDependencies as
      | Record<string, string>
      | undefined;
    expect(dependencies?.["gh-pages"]).toBeUndefined();
    expect(devDependencies?.["gh-pages"]).toBeUndefined();
  });

  it("has no locked gh-pages transitive copy", () => {
    // `npm uninstall gh-pages` prunes the lockfile; a stale
    // `node_modules/gh-pages` entry would reinstall the mirror tooling.
    const packages = (lockJson as { packages?: Record<string, unknown> })
      .packages;
    expect(packages?.["node_modules/gh-pages"]).toBeUndefined();
  });

  it("has no Create-React-App homepage deploy-target leftover", () => {
    // Vite ignores `homepage`; the Netlify URL lives in the README demo
    // link and the deploy dashboard, not in the build config.
    const homepage = (packageJson as { homepage?: string }).homepage;
    expect(homepage).toBeUndefined();
  });
});
