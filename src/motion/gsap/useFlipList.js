import { useEffect, useLayoutEffect, useRef } from "react";
import { useGsap } from "./useGsap.js";
import { captureFlip, playFlip } from "./scene.js";

/** Animates `[data-flip]` children to their new places when `key` changes (state captured in render, played after commit). */
export function useFlipList(ref, key, selector = "[data-flip]") {
  const mods = useGsap();
  const last = useRef(key);
  const state = useRef(null);
  const tween = useRef(null);
  if (last.current !== key) {
    last.current = key;
    state.current = mods && ref.current ? captureFlip(mods.Flip, ref.current, selector) : null;
  }
  useLayoutEffect(() => {
    if (!state.current || !mods) return;
    tween.current = playFlip(mods.Flip, state.current, undefined, tween.current);
    state.current = null;
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => tween.current?.kill(), []);
}
