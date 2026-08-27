/**
 * Contract test for #12 – Legacy parser contract.
 *
 * Seams under test:
 *  - File-system seam: the legacy HTML-string parser must be deleted.
 *  - Static-analysis seam: no product fetch goes through the legacy parser
 *    and no dangerouslySetInnerHTML remains in the app.
 *
 * This test is the red part of the TDD loop for ticket 12. It verifies
 * the acceptance criteria directly so the green step (deleting the files
 * and rewiring Home) makes it pass.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(__dirname);

describe("12 – Legacy parser contract", () => {
  it("deletes the legacy HTML-string parser file(s)", () => {
    expect(existsSync(join(SRC_ROOT, "components/parser/TxtParser.jsx"))).toBe(false);
    expect(existsSync(join(SRC_ROOT, "components/parser/TxtParser.js"))).toBe(false);
    expect(existsSync(join(SRC_ROOT, "components/parser/TxtParser.ts"))).toBe(false);
  });

  it("deletes the legacy GeoAlert component that depended on the parser", () => {
    expect(existsSync(join(SRC_ROOT, "components/pages/forecasts/GeoAlert.tsx"))).toBe(false);
    expect(existsSync(join(SRC_ROOT, "components/pages/forecasts/GeoAlert.jsx"))).toBe(false);
  });

  it("has no dangerouslySetInnerHTML usage in the app source", () => {
    expect(scanFor("dangerouslySetInnerHTML")).toEqual([]);
  });

  it("has no import of the legacy TxtParser anywhere in src", () => {
    expect(scanFor("TxtParser")).toEqual([]);
  });
});

/**
 * Walk src and collect files whose content contains the needle.
 * Excludes this test file itself (it mentions the needles in comments).
 */
function scanFor(needle: string): string[] {
  const violations: string[] = [];
  const SELF = "legacy-parser-contract.test.ts";

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (["node_modules", "dist", "build", ".git"].includes(entry.name)) continue;
        walk(full);
      } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        if (entry.name === SELF) continue;
        const content = readFileSync(full, "utf8");
        if (content.includes(needle)) {
          violations.push(full.replace(SRC_ROOT, "src"));
        }
      }
    }
  };

  walk(SRC_ROOT);
  return violations;
}
