import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const EM_DASH = "\u2014";

function codeFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) {
        if (["node_modules", "dist", "build", ".git", "test-results"].includes(entry.name)) {
          continue;
        }
        walk(full);
      } else if (/\.(ts|tsx|scss|js|jsx)$/.test(entry.name)) {
        out.push(full);
      }
    }
  };
  walk(dir);
  return out;
}

describe("UI surface uses en dashes only", () => {
  it("never uses the em dash character in code", () => {
    const offenders: string[] = [];
    for (const dir of [resolve(__dirname, ".."), resolve(__dirname, "../../e2e")]) {
      for (const file of codeFiles(dir)) {
        const content = readFileSync(file, "utf8");
        const lines = content.split(/\r?\n/);
        lines.forEach((line, index) => {
          if (line.includes(EM_DASH)) {
            offenders.push(`${file.replace(/\\/g, "/")}:${index + 1}: ${line.trim()}`);
          }
        });
      }
    }
    expect(offenders).toEqual([]);
  });
});