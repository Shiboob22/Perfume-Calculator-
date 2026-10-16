import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against the production build (npm run build), served
// the way Vercel serves it (scripts/serve-dist.mjs). Locally they drive the
// installed Google Chrome; CI installs Playwright's Chromium.
// CHROMIUM_PATH points at a Chromium already on the machine (a cloud container).
const channel = process.env.CI || process.env.CHROMIUM_PATH ? undefined : "chrome";
const launchOptions = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  // Visual baselines (e2e/visual.spec.js) are macOS renders, one folder per project.
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}{ext}",
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure" },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"], channel, launchOptions } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel, launchOptions } },
  ],
  webServer: {
    command: "node scripts/serve-dist.mjs",
    url: "http://localhost:4173/",
    reuseExistingServer: !process.env.CI,
  },
});
