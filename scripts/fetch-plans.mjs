// Refreshes src/site/plans.json from the `plans` table before a build, so the
// prerendered pricing page shows what the database says. Plans are readable
// with the public key. If the database can't be reached (CI, offline), the
// committed file is kept and the build goes on.
import { writeFileSync } from "node:fs";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const OUT = "src/site/plans.json";

if (!url || !key || !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)) {
  console.log("fetch-plans: no Supabase project configured; keeping", OUT);
  process.exit(0);
}
try {
  const res = await fetch(`${url}/rest/v1/plans?select=id,name,features,batch_cap,sort&order=sort`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const plans = await res.json();
  if (!Array.isArray(plans) || plans.length === 0) throw new Error("no plans returned");
  writeFileSync(OUT, JSON.stringify(plans, null, 2) + "\n");
  console.log(`fetch-plans: wrote ${plans.length} plans to ${OUT}`);
} catch (err) {
  console.log(`fetch-plans: ${err.message}; keeping ${OUT}`);
}
