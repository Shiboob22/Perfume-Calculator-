import { describe, it, expect, vi } from "vitest";
import { runScene, startScene, dirOf, captureFlip, playFlip, MOTION_QUERY } from "./scene.js";
import { stubGsap, assertSceneRules } from "./testing.js";
import { TOKENS } from "../config.js";

const root = { querySelectorAll: vi.fn(() => ["a", "b"]) };

describe("dirOf", () => {
  it("is -1 under rtl, else 1", () => {
    expect(dirOf({ getAttribute: () => "rtl" })).toBe(-1);
    expect(dirOf({ getAttribute: () => "ltr" })).toBe(1);
    expect(dirOf({ getAttribute: () => null })).toBe(1);
  });
});

describe("runScene", () => {
  it("builds with the ctx inside the no-preference query, scoped to root", () => {
    const s = stubGsap();
    const build = vi.fn();
    runScene({ ...s, root, build, dir: -1 });
    const ctx = build.mock.calls[0][0];
    expect(ctx.dir).toBe(-1);
    expect(ctx.s(600)).toBe(0.6);
    expect(ctx.root).toBe(root);
    expect(ctx.tokens).toBe(TOKENS);
    expect(s.mms[0].added).toEqual([{ query: MOTION_QUERY, scope: root }]);
  });

  it("reverts once on unmount and runs the build's own cleanup", () => {
    const s = stubGsap();
    const cleanup = vi.fn();
    const revert = runScene({ ...s, root, build: () => cleanup });
    revert();
    expect(s.mms[0].reverted).toBe(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("reverts when reduced motion turns on (matchMedia reverts its handler)", () => {
    const s = stubGsap();
    const cleanup = vi.fn();
    runScene({ ...s, root, build: () => cleanup });
    s.mms[0].revert(); // what gsap.matchMedia does when the query stops matching
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("never builds without GSAP or without an element", () => {
    const build = vi.fn();
    expect(startScene(null, root, build, 1)).toBeUndefined();
    expect(startScene(stubGsap(), null, build, 1)).toBeUndefined();
    expect(build).not.toHaveBeenCalled();
  });
});

describe("flip helpers", () => {
  it("captures [data-flip] under root", () => {
    const s = stubGsap();
    const st = captureFlip(s.Flip, root);
    expect(root.querySelectorAll).toHaveBeenCalledWith("[data-flip]");
    expect(st.targets).toEqual(["a", "b"]);
  });

  it("plays with the base duration and kx.out, killing the previous tween", () => {
    const s = stubGsap();
    const prev = { kill: vi.fn() };
    playFlip(s.Flip, { targets: [] }, TOKENS, prev);
    expect(prev.kill).toHaveBeenCalledTimes(1);
    expect(s.calls[0].vars).toEqual({ duration: 0.25, ease: "kx.out", absolute: false, nested: true });
    assertSceneRules(s.calls);
  });
});

describe("assertSceneRules", () => {
  const run = (vars) => () => assertSceneRules([{ fn: "to", targets: null, vars }]);
  it("throws on a bad prop, rotation, ease or duration", () => {
    expect(run({ width: 10 })).toThrow();
    expect(run({ rotation: 2 })).toThrow();
    expect(run({ ease: "back.out" })).toThrow();
    expect(run({ duration: 0.3 })).toThrow();
  });
  it("passes a clean call", () => {
    expect(run({ y: 16, opacity: 0, duration: 0.6, ease: "kx.out" })).not.toThrow();
    expect(run({ rotation: 1, duration: 0.31, ease: "none" })).not.toThrow();
  });
  it("checks the from side of a fromTo", () => {
    expect(() => assertSceneRules([{ fn: "fromTo", from: { height: 0 }, vars: { opacity: 1 } }])).toThrow();
  });
});
