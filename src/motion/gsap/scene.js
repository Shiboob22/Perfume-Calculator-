import { TOKENS } from "../config.js";

// Pure core of the room scenes: the hooks in useRoomScene.js / useFlipList.js are thin wrappers.

export const MOTION_QUERY = "(prefers-reduced-motion: no-preference)";

/** 1 for ltr, -1 for rtl: every x move is multiplied by it. */
export const dirOf = (docEl) => (docEl?.getAttribute?.("dir") === "rtl" ? -1 : 1);

/** What a scene's build function receives. `s` turns token ms into seconds. */
export const makeCtx = ({ gsap, ScrollTrigger, Flip }, root, dir = 1) => ({
  gsap, ScrollTrigger, Flip, tokens: TOKENS, dir, root, s: (ms) => ms / 1000,
});

/**
 * Builds a scene inside gsap.matchMedia (so it reverts when reduced motion
 * turns on), scoped to `root`. Returns a function that reverts it.
 */
export function runScene({ gsap, ScrollTrigger, Flip, root, build, dir = 1, mm = gsap.matchMedia() }) {
  const ctx = makeCtx({ gsap, ScrollTrigger, Flip }, root, dir);
  mm.add(MOTION_QUERY, () => build(ctx), root);
  return () => mm.revert();
}

/** Flip state of every `selector` match under `root`, taken before the DOM changes. */
export const captureFlip = (Flip, root, selector = "[data-flip]") => Flip.getState(root.querySelectorAll(selector));

/** Plays a captured state with the base duration; kills the tween still running from last time. */
export function playFlip(Flip, state, tokens = TOKENS, prev) {
  prev?.kill();
  return Flip.from(state, { duration: tokens.duration.base / 1000, ease: "kx.out", absolute: false, nested: true });
}

/** The hook's guard as a pure function: no GSAP or no element means no build and nothing to revert. */
export function startScene(mods, root, build, dir) {
  return mods && root ? runScene({ ...mods, root, build, dir }) : undefined;
}
