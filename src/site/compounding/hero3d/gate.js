import { useEffect, useState } from "react";
import { flagOn } from "../../../lib/flags";
import { quiet, lowPower } from "../env";

/**
 * Whether the 3D pour may run on this device. Pure, so the rules are tested:
 * both flags on, no reduced motion, not a low-power or Save-Data device, and
 * WebGL there. Anything else keeps the static reading stage.
 */
export function hero3dAllowed({ compounding, hero3d, reduce, low, webgl }) {
  return Boolean(compounding && hero3d && !reduce && !low && webgl);
}

/** Whether this browser can draw WebGL at all (a throwaway probe canvas). */
export function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * The gate as a hook. The first render (and the prerender) is always false,
 * so the server HTML is the static stage whatever the flags say; the device
 * check runs after hydration, like useCompounding().
 */
export function useHero3D() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    setOk(hero3dAllowed({
      compounding: flagOn("compounding"),
      hero3d: flagOn("hero3d"),
      reduce: quiet(),
      low: lowPower(),
      webgl: hasWebGL(),
    }));
  }, []);
  return ok;
}
