import react from "@vitejs/plugin-react";
import { VitePWA, type VitePWAOptions } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

/**
 * Offline PWA + push options (ADR-0006, ticket 02): the repo owns the
 * service worker module (`src/sw.ts`, `injectManifest`) instead of a
 * build-time generated one, so it can hold the push and notification-tap
 * handlers background alerts need. The precache manifest globs the shell
 * (including the bundled Natural Earth land asset behind the Oval glow's
 * basemap); every runtime route and the skipWaiting/clientsClaim semantics
 * live in `src/sw.ts`, driven by the declarative table in
 * `src/push/sw-config.ts` (pinned by unit tests). The app ships its own
 * `public/manifest.json` (`manifest: false`); `includeAssets` precaches the
 * favicon and the icon assets that manifest references.
 */
export const PWA_OPTIONS = {
  strategies: "injectManifest",
  srcDir: "src",
  filename: "sw.ts",
  registerType: "autoUpdate",
  manifest: false,
  includeAssets: ["favicon.ico", "assets/*"],
  injectManifest: {
    globPatterns: ["**/*.{js,css,html,woff2,geojson}"],
  },
} satisfies Partial<VitePWAOptions>;

export default defineConfig({
  plugins: [react(), VitePWA(PWA_OPTIONS)],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.js"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
