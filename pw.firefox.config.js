// Firefox desktop: the engine with no scroll timelines, so the home scene runs on the script fallback.
import { devices } from "@playwright/test";
import base from "./playwright.config.js";
const url = "http://localhost:4212/";
export default { ...base, use: { ...base.use, baseURL: url }, projects: [{ name: "firefox", use: { ...devices["Desktop Firefox"] } }], webServer: { ...base.webServer, command: "PORT=4212 node scripts/serve-dist.mjs", url, reuseExistingServer: false } };
