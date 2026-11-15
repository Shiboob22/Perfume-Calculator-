// Scratch harness for a signed-in Lighthouse run: proxies the built app (serve-dist on 4173),
// answers /api, /auth and /rest with fixtures, and injects a fake session into the app shell.
import { createServer, request } from "node:http";
const USER = { id: "00000000-0000-4000-8000-000000000001", email: "e2e@example.test", aud: "authenticated", role: "authenticated" };
const DAY = 86400000;
const iso = (d) => d.toISOString().slice(0, 10);
const FEATURES = ["batches.unlimited", "inventory", "ai.ask", "export.labels", "calculator.advanced", "cards.download", "journal.insights", "journal.checkins", "journal.reminders", "orders"];
const ID = (n) => `aaaaaaaa-aaaa-4aaa-8aaa-00000000000${n}`;
const mk = (n, ago, pct, ratings) => {
  const at = new Date(Date.now() - ago * DAY - 3600000); const days = [0, 7, 14, 30];
  return { id: ID(n), user_id: USER.id, batch_no: n, fragrance_name: "Oud Nights", tier: "woody", concentration_pct: pct, amount: 50, unit: "ml",
    blend_date: iso(at), created_at: at.toISOString(), remind: false, oil_g: 9.5, oil_ml: 10, ethanol_g: 32.4, ethanol_ml: 40, total_g: 41.9, total_ml: 50, basis: "volume",
    batch_checkins: ratings.map((r, i) => ({ id: `${ID(n)}-${i}`, day: days[i], scheduled_day: days[i], note: "x", rating: r, tags: i === 2 ? ["rounder"] : [], skipped: false, created_at: at.toISOString() })), shared_recipes: null };
};
const batches = [mk(7, 40, 25, [3, 5, 4, 4]), mk(6, 60, 20, [2, 3, 4, 4]), mk(5, 90, 30, [3, 4, 4, 3]), { ...mk(4, 3, 20, [2]), fragrance_name: "Amber Room", tier: "oriental" }];
const me = { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, formulaCap: null, ingredientCap: null, journalWindow: null, trial: null, batchesUsed: 4 };
const session = JSON.stringify({ access_token: "x", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "y", user: USER });
const inject = `<script>(function(){var s=${JSON.stringify(session)};var g=Storage.prototype.getItem;Storage.prototype.getItem=function(k){return /^sb-.+-auth-token$/.test(k)?s:g.call(this,k)};})()</script>`;
const send = (res, body, status = 200) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/auth/v1/user") return send(res, USER);
  if (u.pathname.startsWith("/rest/v1/profiles")) return send(res, [{ locale: "en", default_unit: "ml", default_bottle: 100, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z", bench_tour_at: "2026-11-01T00:00:00Z" }]);
  if (u.pathname.startsWith("/rest/v1/")) return send(res, []);
  if (u.pathname === "/api/me") return send(res, me);
  if (u.pathname === "/api/batches") return send(res, { batches });
  if (u.pathname === "/api/checkins" && req.method === "POST") {
    let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { const body = JSON.parse(b || "{}"); delete body.upsert; send(res, { checkin: { ...body, skipped: false, created_at: new Date().toISOString() } }, 201); });
    return;
  }
  if (u.pathname.startsWith("/api/")) return send(res, { patterns: {}, locked: false });
  const p = request({ host: "127.0.0.1", port: 4173, path: req.url, method: req.method, headers: { ...req.headers, "accept-encoding": "identity" } }, (r) => {
    const type = r.headers["content-type"] || "";
    if (!type.includes("text/html")) { res.writeHead(r.statusCode, r.headers); return r.pipe(res); }
    const chunks = []; r.on("data", (c) => chunks.push(c));
    r.on("end", () => {
      const html = Buffer.concat(chunks).toString().replace("<head>", `<head>${inject}`);
      const h = { ...r.headers }; delete h["content-length"];
      res.writeHead(r.statusCode, h); res.end(html);
    });
  });
  p.on("error", () => { res.writeHead(502); res.end(); });
  req.pipe(p);
}).listen(4180, () => console.log("harness on 4180"));
