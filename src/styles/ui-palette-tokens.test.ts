import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const indexScss = readFileSync(resolve(__dirname, "../index.scss"), "utf8");
const pagesScss = readFileSync(
  resolve(__dirname, "../components/pages/Pages.scss"),
  "utf8",
);
const navScss = readFileSync(
  resolve(__dirname, "../components/navigation/Nav.scss"),
  "utf8",
);
const glossaryScss = readFileSync(
  resolve(__dirname, "../components/explainers/glossary-term.scss"),
  "utf8",
);

describe("UI palette color tokens (ticket 01)", () => {
  it("exposes the eight raw palette colors as CSS custom properties on :root in the global stylesheet", () => {
    expect(indexScss).toContain("--color-white: #FFFFFF");
    expect(indexScss).toContain("--color-black: #000000");
    expect(indexScss).toContain("--color-deep-indigo: #1C1455");
    expect(indexScss).toContain("--color-primary-violet: #7A16A5");
    expect(indexScss).toContain("--color-light-purple: #9934C0");
    expect(indexScss).toContain("--color-dark-green: #3B9C55");
    expect(indexScss).toContain("--color-medium-green: #66C562");
    expect(indexScss).toContain("--color-light-lime: #A0E35F");
  });

  it("exposes semantic aliases and a reusable gradient token on :root", () => {
    expect(indexScss).toContain("--color-bg-page: var(--color-black)");
    expect(indexScss).toContain(
      "--color-bg-header: var(--color-deep-indigo)",
    );
    expect(indexScss).toContain("--color-text-primary: var(--color-white)");
    expect(indexScss).toContain("--color-accent: var(--color-medium-green)");
    expect(indexScss).toContain(
      "--color-accent-strong: var(--color-light-lime)",
    );
    // gradient token for cards — muted violet → indigo (toned down per feedback)
    expect(indexScss).toContain("--gradient-card:");
    expect(indexScss).toContain("var(--color-primary-violet)");
    expect(indexScss).toContain("var(--color-deep-indigo)");
    expect(indexScss).toContain("color-mix");
  });

  it("uses Light Lime strong accent for links, headings, and glossary terms (no old mint) — brighter per feedback", () => {
    // Pages.scss should no longer contain the old mint
    expect(pagesScss).not.toContain("rgb(113, 255, 180)");
    expect(pagesScss).toContain("var(--color-accent-strong)");
    // glossary-term should use strong accent
    expect(glossaryScss).toContain("var(--color-accent-strong)");
    expect(glossaryScss).not.toContain("rgb(113, 255, 180)");
  });

  it("uses Light Lime strong accent for focus-visible and skip-link outlines (no old mint)", () => {
    expect(indexScss).not.toContain("rgb(113, 255, 180)");
    expect(indexScss).toContain("var(--color-accent-strong)");
    expect(navScss).not.toContain("rgb(113, 255, 180)");
    expect(navScss).toContain("var(--color-accent-strong)");
  });

  it("renders surfaces on violet/indigo tokens (header flat, cards gradient, no gray card bg)", () => {
    expect(indexScss).toContain("--color-bg-page");
    expect(pagesScss).not.toContain("rgb(27, 27, 27)");
    expect(pagesScss).toContain("var(--gradient-card)");
    expect(navScss).toContain("var(--color-bg-header)");
    expect(navScss).not.toContain("#1e1958");
  });

  it("renders navigation hover and dropdowns on palette tokens (no old purples/grays) — submenu dark indigo, purple only on hover", () => {
    // old hover purples/grays should be gone
    expect(navScss).not.toContain("rgb(83, 1, 146)");
    expect(navScss).not.toContain("rgb(36, 36, 36)");
    expect(navScss).not.toContain("rgb(116, 116, 116)");
    expect(navScss).not.toContain("rgb(54, 54, 54)");
    // new tokens: top hover still light-purple, submenu base deep-indigo, hover primary-violet
    expect(navScss).toContain("var(--color-light-purple)");
    expect(navScss).toContain("var(--color-primary-violet)");
    expect(navScss).toContain("var(--color-dark-green)");
    expect(navScss).toContain("var(--color-deep-indigo)");
    // submenu hover should be white text, not lime
    expect(navScss).toContain("var(--color-white)");
  });
});
