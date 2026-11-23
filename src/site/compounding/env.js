import { MOTION_SCENE } from "../../lib/compounding/config";

// What the scene may do on this device. Read at use, so the debug page can
// override both (window.__cmp) and tell the scene with a "cmp-env" event.
// Motion: Calm or Off (M6, <html data-mo-level>) stills the scene and the 3D pour too.
export function quiet() {
  const o = typeof window !== "undefined" ? window.__cmp?.reduce : undefined;
  if (o != null) return o;
  const level = typeof document !== "undefined" && document.documentElement.hasAttribute("data-mo-level");
  return level || (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);
}

export function lowPower() {
  if (typeof window === "undefined") return false;
  const o = window.__cmp?.low;
  if (o != null) return o;
  const n = navigator;
  return Boolean(n.connection?.saveData) || (n.hardwareConcurrency > 0 && n.hardwareConcurrency <= MOTION_SCENE.lowPowerCores);
}
