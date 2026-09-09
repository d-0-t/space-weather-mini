import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The install seam: manifest.json and index.html are the public contract
 * with the browser's install prompt, the iOS home-screen launcher and the
 * OS theme. These tests pin the PWA installability and presentation
 * requirements by reading the shipped files directly.
 */

const manifest = (): Record<string, unknown> =>
  JSON.parse(readFileSync(resolve(__dirname, "../../public/manifest.json"), "utf8")) as Record<string, unknown>;

const indexHtml = (): string =>
  readFileSync(resolve(__dirname, "../../index.html"), "utf8");

describe("manifest.json installability", () => {
  it("keeps a stable identity, scope and start URL relative to the deploy base", () => {
    const m = manifest();
    // Deployment-relative so the Netlify root and any subpath deploy both
    // install correctly; "./" resolves to the same origin identity the
    // default (start_url) would have produced, so existing installs keep
    // their identity.
    expect(m.id).toBe("./");
    expect(m.scope).toBe("./");
    expect(m.start_url).toBe(".");
  });

  it("declares standalone display with the dark palette", () => {
    const m = manifest();
    expect(m.display).toBe("standalone");
    expect(m.theme_color).toBe("#000000");
    expect(m.background_color).toBe("#000000");
  });

  it("carries the app name, language and direction", () => {
    const m = manifest();
    expect(m.name).toBe("Space Weather Mini");
    expect(m.short_name).toBe("Space Weather");
    expect(m.lang).toBe("en");
    expect(m.dir).toBe("ltr");
  });

  it("ships icons an install can use: 192, 512 and a 512 maskable", () => {
    const icons = manifest().icons as Array<Record<string, string>>;
    const bySrc = (src: string) => icons.find((icon) => icon.src === src);
    expect(bySrc("assets/icon-192.png")).toMatchObject({
      sizes: "192x192",
      type: "image/png",
    });
    expect(bySrc("assets/icon-512.png")).toMatchObject({
      sizes: "512x512",
      type: "image/png",
    });
    expect(bySrc("assets/icon-maskable-512.png")).toMatchObject({
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    });
  });

  it("categorises the app for store and launcher listings", () => {
    const categories = manifest().categories as string[];
    expect(categories).toContain("weather");
    expect(categories).toContain("utilities");
  });
});

describe("index.html install metadata", () => {
  it("links the manifest, icons and theme color", () => {
    const html = indexHtml();
    expect(html).toContain('<link rel="manifest" href="/manifest.json" />');
    expect(html).toContain(
      '<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />',
    );
    expect(html).toContain('<meta name="theme-color" content="#000000" />');
  });

  it("declares standalone behaviour for iOS home-screen installs", () => {
    const html = indexHtml();
    expect(html).toContain(
      '<meta name="apple-mobile-web-app-capable" content="yes" />',
    );
    expect(html).toContain(
      '<meta name="mobile-web-app-capable" content="yes" />',
    );
    expect(html).toContain(
      '<meta name="apple-mobile-web-app-title" content="Space Weather" />',
    );
    // Dark-only status bar in standalone mode; black does not move content
    // the way black-translucent (under-the-notch) does.
    expect(html).toContain(
      '<meta name="apple-mobile-web-app-status-bar-style" content="black" />',
    );
  });
});
