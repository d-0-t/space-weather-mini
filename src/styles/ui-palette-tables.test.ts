import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const normalize = (s: string): string => s.replace(/\r\n/g, "\n");

const tablesScss = normalize(
  readFileSync(resolve(__dirname, "../components/pages/Tables.scss"), "utf8"),
);
const outlookScss = normalize(
  readFileSync(
    resolve(__dirname, "../components/pages/forecasts/27-day-outlook.scss"),
    "utf8",
  ),
);
const indicesScss = normalize(
  readFileSync(
    resolve(__dirname, "../components/pages/forecasts/daily-geomagnetic-indices.scss"),
    "utf8",
  ),
);

// Frozen data-encoding selectors — byte-identical contract. These are the only
// places raw rgb(...) is allowed. Copied verbatim from the post-recolor file
// (user's manual 75%/30% palette) so the test fails loudly if anyone tokenizes or hue-shifts them.
const FROZEN_KP = [
  `.kp01 {
  background-color: rgb(0, 0, 0) !important;
  color: rgb(162, 162, 162) !important;
}`,
  `.kp12 {
  background-color: rgb(0, 12, 82) !important;
  color: rgb(207, 190, 208) !important;
}`,
  `.kp23 {
  background-color: rgb(0, 47, 78) !important;
}`,
  `.kp34 {
  background-color: rgb(0, 128, 89) !important;
}`,
  `.kp45 {
  background-color: rgb(37, 187, 0) !important;
}`,
  `.kp56 {
  background-color: rgb(187, 255, 0) !important;
  color: rgb(0, 39, 27) !important;
  text-shadow: none;
}`,
  `.kp67 {
  background-color: rgb(255, 166, 0) !important;
  color: rgb(36, 33, 33) !important;
  text-shadow: none;
}`,
  `.kp78 {
  background-color: rgb(255, 102, 0) !important;
}`,
  `.kp89 {
  background-color: rgb(245, 0, 0) !important;
}`,
  `.kp9 {
  background-color: rgb(255, 0, 234) !important;
}`,
];

const FROZEN_A_VALUE = `td[a-value] {
  background-color: rgb(53, 53, 53);
  color: rgb(230, 230, 230);
  text-shadow: 0px 0px 0px;
  width: 15px;
}`;

function stripFrozen(css: string): string {
  let out = css;
  for (const block of FROZEN_KP) out = out.replace(block, "");
  out = out.replace(FROZEN_A_VALUE, "");
  return out;
}

describe("UI palette tabular chrome (ticket 02)", () => {
  it("preserves Kp index presentation bands byte-identical", () => {
    for (const block of FROZEN_KP) {
      expect(tablesScss).toContain(block);
    }
  });

  it("preserves A-index value cells byte-identical", () => {
    expect(tablesScss).toContain(FROZEN_A_VALUE);
  });

  it("renders table borders, header cells and subheader cells via color tokens", () => {
    const chrome = stripFrozen(tablesScss);
    // No hardcoded header/subheader/border grays survive outside frozen
    expect(chrome).not.toContain("rgb(129, 129, 129)");
    expect(chrome).not.toContain("rgb(36, 36, 36)");
    // rgb(53, 53, 53) only allowed inside frozen td[a-value]; stripped chrome must not have it
    expect(chrome).not.toContain("rgb(53, 53, 53)");
    expect(chrome).not.toContain("rgb(191, 231, 210)");

    // Must use palette tokens for chrome (transparent variant is allowed)
    expect(tablesScss).toContain("var(--color-border-muted");
    // header / subheader backgrounds via token or color-mix with deep-indigo
    expect(tablesScss).toMatch(/var\(--color-(deep-indigo|border-muted|bg-surface)/);
  });

  it("renders alternating row stripes via indigo-tinted color-mix 75% and 30%", () => {
    expect(tablesScss).toContain(
      "color-mix(in srgb, var(--color-deep-indigo) 75%, black)",
    );
    expect(tablesScss).toContain(
      "color-mix(in srgb, var(--color-deep-indigo) 30%, black)",
    );
    const chrome = stripFrozen(tablesScss);
    expect(chrome).not.toContain("rgb(41, 41, 41)");
    expect(chrome).not.toContain("rgb(29, 29, 29)");
  });

  it("renders row and cell hover outlines via tokens", () => {
    // Tables.scss hover outlines
    const chrome = stripFrozen(tablesScss);
    expect(chrome).not.toContain("rgb(214, 214, 214)");
    expect(chrome).not.toContain("rgb(82, 82, 82)");
    expect(tablesScss).toMatch(/var\(--color-(border-muted|accent|accent-strong|white|deep-indigo)/);
    // per-product panel hover outlines (BEM wrappers) also via tokens
    expect(outlookScss).not.toContain("rgb(214, 214, 214)");
    expect(indicesScss).not.toContain("rgb(214, 214, 214)");
    expect(outlookScss).toContain("var(--color-");
    expect(indicesScss).toContain("var(--color-");
  });

  it("leaves no stray gray rgb() outside the two frozen selectors", () => {
    const chrome = stripFrozen(tablesScss);
    // After stripping frozen, no rgb() should remain at all — table chrome is fully tokenized
    expect(chrome).not.toMatch(/rgb\(/);
    // also forbid stray outline grays in per-product tabular wrappers
    expect(outlookScss).not.toMatch(/rgb\(/);
    expect(indicesScss).not.toMatch(/rgb\(/);
  });
});
