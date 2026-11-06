import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createBenchClock } from "./benchClock";
import { BENCH_MOTION } from "../../lib/calc";

// The bench clock with a hand-driven requestAnimationFrame: motion allowed
// (a window without reduced motion), time moved by hand.
let queue;
let now;
const step = (ms) => {
  now += ms;
  const due = queue;
  queue = [];
  due.forEach((fn) => fn(now));
};

beforeEach(() => {
  queue = [];
  now = 1000;
  vi.stubGlobal("window", {});
  vi.stubGlobal("requestAnimationFrame", (fn) => { queue.push(fn); return queue.length; });
  vi.stubGlobal("cancelAnimationFrame", () => { queue = []; });
  vi.spyOn(performance, "now").mockImplementation(() => now);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("bench clock", () => {
  it("rests at the first target, then pours to the next", () => {
    const clock = createBenchClock();
    clock.retarget([10, 20, 0.5]);
    expect(clock.get()).toMatchObject({ values: [10, 20, 0.5], done: true });
    clock.retarget([20, 10, 0.5]);
    step(BENCH_MOTION.roll / 2);
    expect(clock.get().done).toBe(false);
    expect(clock.get().flow).toBe(1);
    step(BENCH_MOTION.wobble);
    expect(clock.get()).toMatchObject({ values: [20, 10, 0.5], done: true });
    expect(queue).toHaveLength(0); // the clock stops once at rest
  });

  it("jumps when asked (off screen), with nothing left running", () => {
    const clock = createBenchClock();
    clock.retarget([0, 0, 0]);
    clock.retarget([5, 5, 0.2], { jump: true });
    expect(clock.get()).toMatchObject({ values: [5, 5, 0.2], done: true });
    expect(queue).toHaveLength(0);
  });

  it("slows the same pour down with a pace", () => {
    const normal = createBenchClock();
    const slow = createBenchClock();
    for (const c of [normal, slow]) c.retarget([0, 0, 0]);
    normal.retarget([10, 10, 0.5]);
    slow.retarget([10, 10, 0.5], { pace: 2 });
    step(BENCH_MOTION.roll);
    expect(normal.get().values[0]).toBeCloseTo(10, 1); // rolled in (settling)
    expect(slow.get().values[0]).toBeLessThan(9.9); // half way through its roll
    step(BENCH_MOTION.wobble * 2);
    expect(slow.get()).toMatchObject({ values: [10, 10, 0.5], done: true });
  });

  it("finish() ends a pour where it would rest", () => {
    const clock = createBenchClock();
    clock.retarget([0, 0, 0]);
    clock.retarget([3, 4, 0.1]);
    step(50);
    expect(clock.get().done).toBe(false);
    clock.finish();
    expect(clock.get()).toMatchObject({ values: [3, 4, 0.1], done: true, flow: 0 });
    expect(queue).toHaveLength(0);
  });

  it("tells its subscribers about every frame", () => {
    const clock = createBenchClock();
    const seen = [];
    clock.subscribe(() => seen.push(clock.get().values[0]));
    clock.retarget([0, 0, 0]);
    clock.retarget([1, 0, 0]);
    step(100);
    step(1000);
    expect(seen[0]).toBe(0);
    expect(seen.at(-1)).toBe(1);
    expect(seen.length).toBeGreaterThanOrEqual(3);
  });
});
