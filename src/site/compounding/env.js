import { SMOKE } from "../../lib/compounding/config";

// What the scene may do on this device. Read at use, so the debug page can
// override both (window.__cmp) and tell the scene with a "cmp-env" event.
export function quiet() {
  const o = typeof window !== "undefined" ? window.__cmp?.reduce : undefined;
  return o ?? (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);
}

export function lowPower() {
  if (typeof window === "undefined") return false;
  const o = window.__cmp?.low;
  if (o != null) return o;
  const n = navigator;
  return Boolean(n.connection?.saveData) || (n.hardwareConcurrency > 0 && n.hardwareConcurrency <= SMOKE.lowPowerCores);
}
