import { describe, it, expect } from "vitest";
import { makeCtx } from "../../motion/gsap/scene.js";
import { stubGsap, assertSceneRules } from "../../motion/gsap/testing.js";
import { rowIn, rowOut, tierRing, placeRing, stamp } from "./scene.js";

const ctxOf = (s, ok = true) => ({ ...makeCtx(s, {}, 1), add: (fn) => (ok ? fn() : undefined) });

describe("Bench scenes", () => {
  it("rowIn: y 8 to 0, opacity 0 to 1, base", () => {
    const s = stubGsap();
    rowIn(ctxOf(s), {});
    expect(s.calls[0].from).toEqual({ y: 8, opacity: 0 });
    expect(s.calls[0].vars).toMatchObject({ y: 0, opacity: 1, duration: 0.25, ease: "kx.out" });
    assertSceneRules(s.calls);
  });
  it("rowOut: the reverse, resolves when the tween completes", async () => {
    const s = stubGsap();
    let done = false;
    const p = rowOut(ctxOf(s), {}).then(() => { done = true; });
    expect(s.calls[0].vars).toMatchObject({ y: 8, opacity: 0, duration: 0.25 });
    assertSceneRules(s.calls);
    await Promise.resolve();
    expect(done).toBe(false);
    s.calls[0].vars.onComplete();
    await p;
    expect(done).toBe(true);
  });
  it("rowOut resolves at once with no ctx, or when motion is off", async () => {
    await expect(rowOut(null, {})).resolves.toBeUndefined();
    const s = stubGsap();
    await expect(rowOut(ctxOf(s, false), {})).resolves.toBeUndefined();
    expect(s.calls).toHaveLength(0);
  });
  it("tierRing fits the ring to the target over base, as transforms", () => {
    const s = stubGsap();
    const ring = {}, target = {};
    tierRing(ctxOf(s), ring, target);
    expect(s.calls[0]).toMatchObject({ fn: "Flip.fit", targets: [ring, target] });
    expect(s.calls[0].vars).toEqual({ duration: 0.25, ease: "kx.out", scale: true });
    assertSceneRules(s.calls);
    tierRing(ctxOf(s), ring, target, true);
    expect(s.calls[1].vars).toEqual({ scale: true });
  });
  it("placeRing places at once the first time and under reduced motion, and slides otherwise", () => {
    const s = stubGsap();
    const ring = {}, target = {};
    placeRing(ctxOf(s, false), ring, target, { ok: false });
    placeRing(ctxOf(s), ring, target, { first: true });
    expect(s.calls.map((c) => c.vars)).toEqual([{ scale: true }, { scale: true }]);
    placeRing(ctxOf(s), ring, target);
    expect(s.calls[2].vars).toEqual({ duration: 0.25, ease: "kx.out", scale: true });
    assertSceneRules(s.calls);
  });
  it("stamp: scale 1.04 to 1 only (no opacity), slow, origin at the inline start", () => {
    const s = stubGsap();
    stamp(ctxOf(s), {});
    expect(s.calls[0].from).toEqual({ scale: 1.04, transformOrigin: "left center" });
    expect(s.calls[0].vars).toEqual({ scale: 1, duration: 0.6, ease: "kx.out" });
    assertSceneRules(s.calls);
    stamp({ ...ctxOf(s), dir: -1 }, {});
    expect(s.calls[1].from.transformOrigin).toBe("right center");
  });
  it("rowOut also resolves when the tween is interrupted", async () => {
    const s = stubGsap();
    const p = rowOut(ctxOf(s), {});
    s.calls[0].vars.onInterrupt();
    await expect(p).resolves.toBeUndefined();
  });
  it("all four do nothing without a ctx", () => {
    rowIn(null, {}); tierRing(null, {}, {}); stamp(null, {});
  });
});
