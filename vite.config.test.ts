import { describe, expect, it } from "vitest";

import { PWA_OPTIONS } from "./vite.config";

/**
 * The push-foundation migration (ticket 02): the plugin no longer generates
 * the worker – the repo owns `src/sw.ts` (injectManifest) with push and
 * notification-tap handlers, while the precache globs and every runtime
 * route move into the declarative table in `src/push/sw-config.ts`
 * (pinned by that module's tests).
 */
describe("PWA build configuration", () => {
  it("injects the owned worker module instead of generating one", () => {
    expect(PWA_OPTIONS.strategies).toBe("injectManifest");
    expect(PWA_OPTIONS.srcDir).toBe("src");
    expect(PWA_OPTIONS.filename).toBe("sw.ts");
    expect(PWA_OPTIONS.registerType).toBe("autoUpdate");
    expect(PWA_OPTIONS.manifest).toBe(false);
    expect(PWA_OPTIONS.injectManifest?.globPatterns).toEqual([
      "**/*.{js,css,html,woff2,geojson}",
    ]);
  });

  it("keeps no generated-worker-only workbox block", () => {
    // generateSW's runtimeCaching/skipWaiting/clientsClaim live in src/sw.ts
    // now; a leftover block would be dead configuration.
    expect(PWA_OPTIONS.workbox).toBeUndefined();
  });

  it("precaches the favicon and the manifest icon assets", () => {
    expect(PWA_OPTIONS.includeAssets).toEqual(["favicon.ico", "assets/*"]);
  });
});
