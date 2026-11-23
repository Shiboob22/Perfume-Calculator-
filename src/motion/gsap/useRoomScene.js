import { useEffect, useState } from "react";
import { loadGsap, peekGsap } from "./load.js";
import { dirOf, makeCtx, startScene } from "./scene.js";

/** GSAP once loaded, else null (also null when motion is not allowed). */
function useGsap() {
  const [mods, setMods] = useState(peekGsap);
  useEffect(() => {
    if (mods) return undefined;
    let live = true;
    loadGsap().then((m) => { if (live && m) setMods(m); });
    return () => { live = false; };
  }, [mods]);
  return mods;
}

/** Runs `build(ctx)` once GSAP is loaded, reverting on unmount, on a deps change and under reduced motion. */
export function useRoomScene(ref, build, deps = []) {
  const mods = useGsap();
  useEffect(() => {
    return startScene(mods, ref.current, build, dirOf(document.documentElement));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mods, ...deps]);
}

/** The scene ctx for event-driven scenes (null until GSAP and the element are there). */
export function useSceneCtx(ref) {
  const mods = useGsap();
  const [ctx, setCtx] = useState(null);
  useEffect(() => {
    if (mods && ref.current) setCtx(makeCtx(mods, ref.current, dirOf(document.documentElement)));
  }, [mods, ref]);
  return ctx;
}
