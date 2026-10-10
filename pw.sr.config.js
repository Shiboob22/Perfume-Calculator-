// The screen-reader proxy suite on its own port (4173 may be another worktree's server).
import base from "./playwright.config.js";
const url = "http://localhost:4212/";
export default { ...base, use: { ...base.use, baseURL: url }, webServer: { ...base.webServer, command: "PORT=4212 node scripts/serve-dist.mjs", url, reuseExistingServer: false } };
