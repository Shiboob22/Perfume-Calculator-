import { describe, expect, it } from "vitest";
import { flipDeltas, flipEntered } from "./flip.js";

const m = (o) => new Map(Object.entries(o));

describe("flipDeltas (motion M3: a re-sort is shown, not swapped)", () => {
  it("moves each row from its old place to its new one", () => {
    const before = m({ a: { x: 0, y: 0 }, b: { x: 0, y: 60 }, c: { x: 0, y: 120 } });
    const after = m({ c: { x: 0, y: 0 }, b: { x: 0, y: 60 }, a: { x: 0, y: 120 } });
    expect(flipDeltas(before, after)).toEqual([{ key: "c", dx: 0, dy: 120 }, { key: "a", dx: 0, dy: -120 }]);
  });
  it("leaves rows that did not move (under 1 px) and rows that are new", () => {
    const before = m({ a: { x: 0, y: 0 }, b: { x: 0, y: 60 } });
    const after = m({ a: { x: 0.4, y: 0.6 }, n: { x: 0, y: 60 }, b: { x: 0, y: 120 } });
    expect(flipDeltas(before, after)).toEqual([{ key: "b", dx: 0, dy: -60 }]);
    expect(flipEntered(before, after)).toEqual(["n"]);
  });
  it("moves sideways too (a grid, or a mirrored Arabic layout), rounded to 0.1 px", () => {
    expect(flipDeltas(m({ a: { x: 300.04, y: 0 } }), m({ a: { x: 0, y: 0 } }))).toEqual([{ key: "a", dx: 300, dy: 0 }]);
  });
  it("only moves rows on screen before or after, so 60 batches cost a screenful", () => {
    const n = 60;
    const before = new Map(Array.from({ length: n }, (_, i) => [`r${i}`, { x: 0, y: i * 80 }]));
    const after = new Map(Array.from({ length: n }, (_, i) => [`r${i}`, { x: 0, y: (n - 1 - i) * 80 }]));
    const moves = flipDeltas(before, after, { top: 0, bottom: 800, height: 80 });
    // On screen before (rows 0–9) or after (rows 50–59): 20 rows of 60.
    expect(moves).toHaveLength(20);
    expect(moves.every(({ key }) => { const i = Number(key.slice(1)); return i < 10 || i >= 50; })).toBe(true);
  });
  it("counts a row partly on screen, and caps the number moved", () => {
    expect(flipDeltas(m({ a: { x: 0, y: -50 } }), m({ a: { x: 0, y: -400 } }), { top: 0, bottom: 800, height: 60 })).toHaveLength(1);
    expect(flipDeltas(m({ a: { x: 0, y: -70 } }), m({ a: { x: 0, y: -400 } }), { top: 0, bottom: 800, height: 60 })).toHaveLength(0);
    const before = new Map(Array.from({ length: 10 }, (_, i) => [`r${i}`, { x: 0, y: i }]));
    const after = new Map(Array.from({ length: 10 }, (_, i) => [`r${i}`, { x: 0, y: i + 50 }]));
    expect(flipDeltas(before, after, { max: 3 })).toHaveLength(3);
  });
});
