import { useEffect, useState } from "react";
import { loadGsap, peekGsap } from "./load.js";

/** GSAP once loaded, else null (also null when motion is not allowed). */
export function useGsap() {
  const [mods, setMods] = useState(peekGsap);
  useEffect(() => {
    if (mods) return undefined;
    let live = true;
    loadGsap().then((m) => { if (live && m) setMods(m); });
    return () => { live = false; };
  }, [mods]);
  return mods;
}
