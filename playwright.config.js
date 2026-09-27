import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against the production build (npm run build), served
// the way Vercel serves it (scripts/serve-dist.mjs). Locally they drive the
// installed Google Chrome; CI installs Playwright's Chromium.
const channel = process.env.CI ? undefined : "chrome";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure" },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"], channel } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel } },
  ],
  webServer: {
    command: "node scripts/serve-dist.mjs",
    url: "http://localhost:4173/",
    reuseExistingServer: !process.env.CI,
  },
});
