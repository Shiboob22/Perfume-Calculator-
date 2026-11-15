// Prints a new VAPID key pair for Web Push (api/_lib/webpush.ts): put VAPID_PUBLIC_KEY and
// VAPID_PRIVATE_KEY in Vercel. Keep the private key secret; changing the pair drops every
// existing subscription (they were made against the old public key).
import { generateKeyPairSync } from "node:crypto";
const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const jwk = privateKey.export({ format: "jwk" });
const b = (s) => Buffer.from(s, "base64url");
const publicKey = Buffer.concat([Buffer.from([4]), b(jwk.x), b(jwk.y)]).toString("base64url");
console.log(`VAPID_PUBLIC_KEY=${publicKey}\nVAPID_PRIVATE_KEY=${jwk.d}`);
