import { describe, expect, it } from "vitest";
import { createGovernor, particlesAt } from "./fpsGovernor.js";

describe("fps governor", () => {
  it("stays at full quality on a steady 60 fps", () => {
    const g = createGovernor();
    for (let i = 0; i < 300; i++) g.push(16.7);
    expect(g.level).toBe(0);
  });
  it("steps down one level per slow window, then stops at 2", () => {
    const g = createGovernor({ frames: 10 });
    for (let i = 0; i < 10; i++) g.push(40);
    expect(g.level).toBe(1);
    for (let i = 0; i < 10; i++) g.push(40);
    expect(g.level).toBe(2);
    for (let i = 0; i < 50; i++) g.push(40);
    expect(g.level).toBe(2);
  });
  it("ignores a gap from a hidden tab", () => {
    const g = createGovernor({ frames: 5 });
    for (let i = 0; i < 5; i++) g.push(5000);
    expect(g.level).toBe(0);
  });
  it("halves, then removes, the particles", () => {
    expect([particlesAt(20, 0), particlesAt(20, 1), particlesAt(20, 2)]).toEqual([20, 10, 0]);
  });
});
