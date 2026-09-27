// Fails the build if anything secret reached the browser bundle in dist/.
// Publishable/anon keys are fine by design; service-role keys, secret keys
// and Gemini keys are not. Every JWT found is decoded and must be role=anon.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|mjs|html|css|json|map|txt|xml)$/.test(name)) files.push(p);
  }
})(DIST);

const FORBIDDEN = [
  [/service_role/, "the words service_role"],
  [/sb_secret_[A-Za-z0-9_-]{10,}/, "a Supabase secret key (sb_secret_…)"],
  [/AIza[0-9A-Za-z_-]{30,}/, "a Google API key (AIza…)"],
  [/SUPABASE_SERVICE_ROLE_KEY|GEMINI_API_KEY/, "a server-only env var name"],
];
const JWT = /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;

const problems = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const [re, what] of FORBIDDEN) if (re.test(text)) problems.push(`${file}: ${what}`);
  for (const token of text.match(JWT) || []) {
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
      if (payload.role !== "anon") problems.push(`${file}: JWT with role "${payload.role}"`);
    } catch {
      problems.push(`${file}: undecodable JWT-like string`);
    }
  }
}

if (problems.length) {
  console.error("Secret check failed:\n" + problems.map((p) => "  - " + p).join("\n"));
  process.exit(1);
}
console.log(`Secret check passed: ${files.length} files in ${DIST}/, no secrets.`);
