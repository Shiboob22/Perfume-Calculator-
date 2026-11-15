// Web push for the Journal (J2b), browser side. The server sends an empty push when a batch
// reaches a milestone; public/push-sw.js (loaded by the service worker) writes the words.
import { authHeaders, apiError } from "./fragranceApi";

const URL = "/api/checkins?push=";

/** This browser can do web push at all (on iPhone only from the home screen). */
export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** A base64url string (the VAPID public key) as the bytes pushManager.subscribe wants. */
export function keyToBytes(b64url) {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const raw = atob((b64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** The server's public key, or null when push is not set up there. */
export async function pushKey() {
  const res = await fetch(`${URL}key`);
  return res.ok ? (await res.json()).publicKey : null;
}

/** The subscription this browser already has, or null. */
export async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

/** Asks permission, subscribes and tells the server. Throws "denied" if permission is refused. */
export async function enablePush(publicKey) {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("denied");
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) });
  const res = await fetch(`${URL}subscribe`, { method: "POST", headers: await authHeaders(), body: JSON.stringify(sub.toJSON()) });
  if (!res.ok) { await sub.unsubscribe().catch(() => {}); throw await apiError(res); }
  return sub;
}

/** Stops nudging this browser: tells the server, then drops the subscription. */
export async function disablePush() {
  const sub = await currentSubscription();
  if (!sub) return;
  await fetch(`${URL}unsubscribe`, { method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}
