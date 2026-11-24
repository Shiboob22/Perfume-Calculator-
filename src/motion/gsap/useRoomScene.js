import { useEffect, useRef, useState } from "react";
import { useGsap } from "./useGsap.js";
import { dirOf, eventScene, startScene } from "./scene.js";

/** Runs `build(ctx)` once GSAP is loaded, reverting on unmount, on a deps change and under reduced motion. */
export function useRoomScene(ref, build, deps = []) {
  const mods = useGsap();
  useEffect(() => {
    return startScene(mods, ref.current, build, dirOf(document.documentElement));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mods, ...deps]);
}

/** The scene ctx for event-driven scenes (null until GSAP and the element are there); reverted on unmount. */
export function useSceneCtx(ref) {
  const mods = useGsap();
  const [ctx, setCtx] = useState(null);
  const live = useRef(null); // { root, revert }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { // every render: the element may mount after GSAP loaded
    const root = ref.current;
    if (!mods || !root || live.current?.root === root) return;
    live.current?.revert();
    const { ctx: next, revert } = eventScene(mods, root, dirOf(document.documentElement));
    live.current = { root, revert };
    setCtx(next);
  });
  useEffect(() => () => live.current?.revert(), []);
  return ctx;
}
