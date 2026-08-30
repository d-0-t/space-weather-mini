import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  use: {
    baseURL: "http://localhost:4173",
  },
  webServer: {
    command: "vite build && vite preview",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Build with the alerts feature flag on – the alerts e2e spec drives the
    // modal that the production default hides.
    env: { VITE_ALERTS_ENABLED: "true" },
  },
});