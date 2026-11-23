import { describe, it, expect } from "vitest";
import { makeCtx } from "../../motion/gsap/scene.js";
import { stubGsap, assertSceneRules } from "../../motion/gsap/testing.js";
import { rowIn, rowOut, tierRing, stamp } from "./scene.js";

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
  it("stamp: 1.04 to 1 and opacity, slow, no bounce", () => {
    const s = stubGsap();
    stamp(ctxOf(s), {});
    expect(s.calls[0].from).toEqual({ scale: 1.04, opacity: 0 });
    expect(s.calls[0].vars).toMatchObject({ scale: 1, opacity: 1, duration: 0.6, ease: "kx.out" });
    assertSceneRules(s.calls);
  });
  it("all four do nothing without a ctx", () => {
    rowIn(null, {}); tierRing(null, {}, {}); stamp(null, {});
  });
});
