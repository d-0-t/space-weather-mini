import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Push-sender ADR contract (background-alerts ticket 08): ADR-0001 stays
 * honest about the one push sender beside the static SPA, the Blobs-now
 * decision is recorded, and no stale claim that the app has no sender
 * survives in the README or the research briefs. Pins the docs seam the
 * same way deploy-target.test.ts pins the deploy seam - reading the
 * shipped files directly.
 */

const adrDir = resolve(__dirname, "docs/adr");
const researchDir = resolve(__dirname, "docs/research");

const readAdr = (name: string): string =>
  readFileSync(resolve(adrDir, name), "utf8");

const findAdr12 = (): string | null => {
  const match = readdirSync(adrDir).find((entry) =>
    /^0012-.*\.md$/.test(entry),
  );
  return match ? readAdr(match) : null;
};

describe("ADR-0001 push-sender exception", () => {
  it("names the push sender as the justified exception to client-side-only", () => {
    const adr = readAdr("0001-client-side-only-architecture.md");
    expect(adr).toContain("push sender");
    expect(adr.toLowerCase()).toContain("exception");
    expect(adr).toContain("services.swpc.noaa.gov");
  });

  it("keeps the static SPA reading NOAA directly as the rule", () => {
    const adr = readAdr("0001-client-side-only-architecture.md");
    expect(adr.toLowerCase()).toContain("static");
    expect(adr).toContain("localStorage");
  });

  it("carries no absolute claim the app has no sender", () => {
    const adr = readAdr("0001-client-side-only-architecture.md");
    expect(adr).not.toContain("no backend, no proxy, no database");
  });
});

describe("ADR-0012 push-sender storage seam", () => {
  it("exists as the next decision record", () => {
    expect(findAdr12()).not.toBeNull();
  });

  it("records the 3-method seam starting on Netlify Blobs", () => {
    const adr = findAdr12() ?? "";
    expect(adr).toContain("save");
    expect(adr).toContain("load-all");
    expect(adr).toContain("remove");
    expect(adr).toContain("Blobs");
  });

  it("names the Postgres trigger and what stays untouched on migration day", () => {
    const adr = findAdr12() ?? "";
    expect(adr).toContain("Postgres");
    expect(adr.toLowerCase()).toContain("trigger");
    expect(adr.toLowerCase()).toContain("untouched");
  });
});

describe("README push-sender statement", () => {
  it("no longer claims the app has no sender", () => {
    const readme = readFileSync(resolve(__dirname, "README.md"), "utf8");
    expect(readme).not.toContain("No backend");
  });

  it("names the push sender beside the SPA", () => {
    const readme = readFileSync(resolve(__dirname, "README.md"), "utf8");
    expect(readme).toContain("push sender");
  });
});

describe("research brief tension notes", () => {
  const briefs = [
    "aurora-chaser-features-2026-08-25.md",
    "webcam-sources-2026-08-29.md",
    "aurora-local-conditions-2026-09-01.md",
    "pwa-background-alerts-2026-09-18.md",
  ];

  it("carry no unqualified claim the app has no sender", () => {
    for (const brief of briefs) {
      const content = readFileSync(resolve(researchDir, brief), "utf8");
      expect(content).not.toContain("No backend");
    }
  });

  it("point the push decision at the amended ADR", () => {
    const brief = readFileSync(
      resolve(researchDir, "pwa-background-alerts-2026-09-18.md"),
      "utf8",
    );
    expect(brief).toContain("ADR-0001");
    expect(brief.toLowerCase()).toContain("amendment");
  });
});
