// Local run on a free port (4173 may be another worktree's server).
import base from "./playwright.config.js";
const url = "http://localhost:4199/";
export default { ...base, use: { ...base.use, baseURL: url }, webServer: { ...base.webServer, command: "PORT=4199 node scripts/serve-dist.mjs", url, reuseExistingServer: false } };
