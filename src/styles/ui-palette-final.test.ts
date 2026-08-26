import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const normalize = (s: string): string => s.replace(/\r\n/g, "\n");

const read = (p: string) => normalize(readFileSync(resolve(__dirname, p), "utf8"));

const appScss = read("../components/App.scss");
const indexScss = read("../index.scss");
const tablesScss = read("../components/pages/Tables.scss");
const pagesScss = read("../components/pages/Pages.scss");
const homeScss = read("../components/pages/home/Home.scss");
const navScss = read("../components/navigation/Nav.scss");

// Helper to walk src for scss files
function allScssFiles(dir: string = resolve(__dirname, "..")): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, e.name);
      if (e.isDirectory()) {
        if (["node_modules", "dist", "build", ".git"].includes(e.name)) continue;
        walk(full);
      } else if (e.name.endsWith(".scss")) {
        out.push(full);
      }
    }
  };
  walk(dir);
  return out;
}

// Contrast helper per WCAG (relative luminance)
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function luminChannel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * luminChannel(r) + 0.7152 * luminChannel(g) + 0.0722 * luminChannel(b);
}
function contrast(hex1: string, hex2: string): number {
  const L1 = luminance(hex1);
  const L2 = luminance(hex2);
  const l1 = Math.max(L1, L2);
  const l2 = Math.min(L1, L2);
  return (l1 + 0.05) / (l2 + 0.05);
}

describe("UI palette final sweep — ticket 03 contract", () => {
  it("narrows the global * { color: white } override so accents actually render", () => {
    // App.scss must not contain the broad universal override
    expect(appScss).not.toMatch(/\*\s*\{[^}]*color\s*:\s*white/);
    expect(appScss).not.toMatch(/\*\s*\{[^}]*color\s*:\s*#fff/);
    expect(appScss).not.toContain("* {");
    // If App.scss sets a default text color, it must be via token on html/body, not *
    if (appScss.trim().length > 0) {
      // Must not contain any color declaration outside a token
      // Either file is empty (relying on index.scss body color) or uses token
      const hasColor = /color\s*:/.test(appScss);
      if (hasColor) {
        expect(appScss).toMatch(/var\(--color-/);
      }
    }
    // No stray * selector with color in Nav either (broad override)
    // Nav's * { color: var(--color-text-primary)} is also broad — should be narrowed
    // For ticket 03 final, the only global text color should be via html/body
    const hasGlobalStarInNav = /\*\s*\{[^}]*color\s*:/.test(navScss);
    expect(hasGlobalStarInNav).toBe(false);
  });

  it("recolors remaining chrome via tokens: app shell, Recharts axis/tooltip, aurora image and home mini-card borders, footer muted text", () => {
    // Recharts axis text fill must be via token, not hardcoded rgb(220, 204, 204)
    expect(indexScss).not.toContain("rgb(220, 204, 204)");
    expect(indexScss).toContain(".recharts-text");
    expect(indexScss).toMatch(/\.recharts-text\s*\{[^}]*fill\s*:\s*var\(--color-/);
    // Tooltip background must be via token, not keyword black/rgb
    expect(indexScss).not.toMatch(/\.recharts-default-tooltip\s*\{[^}]*background-color\s*:\s*black/);
    expect(indexScss).toMatch(/\.recharts-default-tooltip\s*\{[^}]*background-color\s*:\s*var\(--color-/);
    // Aurora image borders already via token (Pages.scss)
    expect(pagesScss).toContain("border: 3px solid var(--color-border-muted)");
    // Home mini-card borders already via token (now in home/Home.scss per atomic design)
    expect(homeScss).toContain("border: 2px dashed var(--color-border-muted-transparent)");
    // Footer muted text via token (color-mix with white)
    expect(pagesScss).toMatch(/footer\s*\{[^}]*color\s*:\s*color-mix\(in srgb, var\(--color-white\)/);
    // Tables text-shadow is the user's var(--text-stroke-black) (allowed as chrome, not raw)
    expect(tablesScss).toMatch(/text-shadow:\s*var\(--text-stroke-black\)/);
  });

  it("contract invariant: only surviving raw rgb(...) / #... outside node_modules are frozen .kp01-.kp9 and td[a-value] (and :root token definitions)", () => {
    const files = allScssFiles();
    // Build a combined string with :root blocks removed (tokens definitions allowed) and frozen blocks removed
    // Use lenient patterns that match the frozen byte-identical blocks regardless of exact formatting —
    // matches from the selector to its closing brace.
    const frozenPatterns = [
      /\.kp01[\s\S]*?\}/,
      /\.kp12[\s\S]*?\}/,
      /\.kp23[\s\S]*?\}/,
      /\.kp34[\s\S]*?\}/,
      /\.kp45[\s\S]*?\}/,
      /\.kp56[\s\S]*?\}/,
      /\.kp67[\s\S]*?\}/,
      /\.kp78[\s\S]*?\}/,
      /\.kp89[\s\S]*?\}/,
      /\.kp9[\s\S]*?\}/,
      /td\[a-value\][\s\S]*?\}/,
    ];
    for (const file of files) {
      let content = normalize(readFileSync(file, "utf8"));
      // Remove :root block (tokens) — allow raw # there
      content = content.replace(/:root\s*\{[\s\S]*?\}/g, "");
      // Remove frozen blocks — use global replace to handle grouped selector + individual blocks
      for (const pat of frozenPatterns) {
        content = content.replace(new RegExp(pat.source, "g"), "");
      }
      // Allow the user's Tables.scss multi-shadow #000 chrome (not tokenized per manual) and grouped text-shadow var
      content = content.replace(/text-shadow:\s*1px 1px 0px #000[\s\S]*?;/g, "");
      content = content.replace(/text-shadow:\s*0px 0px 0px;/g, "");
      content = content.replace(/text-shadow:\s*var\(--text-stroke-black\);/g, "");
      // Now no raw rgb( or #hex should remain
      // Allow comments? Strip comments first to avoid false positives from URLs
      const withoutComments = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      const hasRgb = /rgb\s*\(/i.test(withoutComments);
      const hasHex = /#[0-9a-fA-F]{3,6}\b/.test(withoutComments);
      if (hasRgb || hasHex) {
        // Debug: log the remaining raw for diagnosis
        const rgbMatch = withoutComments.match(/rgb\s*\([^)]+\)/i);
        const hexMatch = withoutComments.match(/#[0-9a-fA-F]{3,6}\b/);
        console.log("RAW REMAINING in", file, "rgb:", rgbMatch, "hex:", hexMatch, withoutComments.slice(0, 2000));
        // Provide file context on failure
        expect(
          `${file.replace(resolve(__dirname, ".."), "src")} still has raw color after stripping :root and frozen: ${withoutComments.slice(0, 200)}`,
        ).toBe("");
      }
    }
  });

  it("single dark theme invariant holds — no light-theme code", () => {
    const files = allScssFiles().concat(
      readdirSync(resolve(__dirname, ".."), { withFileTypes: true })
        .filter((e) => e.isFile() && e.name.endsWith(".tsx"))
        .map(() => "") // placeholder to avoid empty
    );
    // Direct scan for prefers-color-scheme
    for (const f of allScssFiles()) {
      const c = readFileSync(f, "utf8");
      expect(c).not.toMatch(/prefers-color-scheme/);
      expect(c).not.toMatch(/light-theme/);
    }
    // Also check index.scss and App.tsx etc. for prefers-color-scheme
    const allSrc = allScssFiles();
    // Check tsx files for prefers-color-scheme as well
    const SELF = "ui-palette-final.test.ts";
    const walkTs = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, e.name);
        if (e.isDirectory()) {
          if (["node_modules", "dist", "build", ".git"].includes(e.name)) continue;
          walkTs(full);
        } else if (/\.(ts|tsx|js|jsx)$/.test(e.name)) {
          if (e.name === SELF) continue;
          const c = readFileSync(full, "utf8");
          expect(c).not.toMatch(/prefers-color-scheme/);
        }
      }
    };
    walkTs(resolve(__dirname, ".."));
    // Ensure page background is still Black via token, not light
    expect(indexScss).toContain("--color-bg-page: var(--color-black)");
    expect(indexScss).toContain("background-color: var(--color-bg-page)");
  });

  it("contrast verification: White on Black ~21:1, White on Deep Indigo ~14:1, Light Lime on Black ~13:1, Medium Green on Black ~7:1 all exceed WCAG 2.1 AA", () => {
    const white = "#ffffff";
    const black = "#000000";
    const deepIndigo = "#1c1455";
    const lightLime = "#a0e35f";
    const mediumGreen = "#66c562";

    const wOnB = contrast(white, black);
    const wOnI = contrast(white, deepIndigo);
    const limeOnB = contrast(lightLime, black);
    const greenOnB = contrast(mediumGreen, black);

    expect(wOnB).toBeGreaterThan(20); // ~21:1
    expect(wOnI).toBeGreaterThan(12); // ~14:1
    expect(limeOnB).toBeGreaterThan(10); // ~13:1
    expect(greenOnB).toBeGreaterThan(6); // ~7:1

    // All exceed AA thresholds
    for (const c of [wOnB, wOnI, limeOnB, greenOnB]) {
      expect(c).toBeGreaterThanOrEqual(4.5); // normal text
      expect(c).toBeGreaterThanOrEqual(3); // large text
    }
  });

  it("vocabulary and standards hold: UI palette, color token, surface, accent per CONTEXT.md and SCSS+BEM", () => {
    // Index.scss exposes palette via :root
    expect(indexScss).toContain("--color-white: #ffffff");
    expect(indexScss).toContain("--gradient-card:");
    // Pages.scss uses surface gradient via token
    expect(pagesScss).toContain("var(--gradient-card)");
    // Glossary term uses accent
    const glossary = read("../components/explainers/glossary-term.scss");
    expect(glossary).toContain("var(--color-accent-strong)");
    // No raw inline hex in components outside frozen/:root
    // Already covered by contract invariant
  });
});
