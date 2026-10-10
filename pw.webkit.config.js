// WebKit with iPhone emulation: the closest stand-in for Safari on an iPhone without Xcode.
import { devices } from "@playwright/test";
import base from "./playwright.config.js";
const url = "http://localhost:4211/";
export default { ...base, use: { ...base.use, baseURL: url }, projects: [{ name: "iphone", use: { ...devices["iPhone 15"] } }], webServer: { ...base.webServer, command: "PORT=4211 node scripts/serve-dist.mjs", url, reuseExistingServer: false } };
