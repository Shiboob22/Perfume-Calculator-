import { describe, it, expect } from "vitest";
import { enqueue, pending, flush, isOffline } from "./outbox";

function memory() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
}

describe("outbox", () => {
  it("queues batches and sends them in order", async () => {
    const s = memory();
    enqueue({ id: "a" }, s);
    enqueue({ id: "b" }, s);
    const seen = [];
    const r = await flush(async (b) => { seen.push(b.id); }, s);
    expect(seen).toEqual(["a", "b"]);
    expect(r).toEqual({ sent: 2, refused: [], left: 0 });
    expect(pending(s)).toEqual([]);
  });

  it("stops and keeps the rest when the connection drops", async () => {
    const s = memory();
    enqueue({ id: "a" }, s);
    enqueue({ id: "b" }, s);
    const r = await flush(async () => { throw new TypeError("Failed to fetch"); }, s);
    expect(r.left).toBe(2);
    expect(pending(s).map((x) => x.batch.id)).toEqual(["a", "b"]);
  });

  it("drops a batch the server refuses and carries on", async () => {
    const s = memory();
    enqueue({ id: "bad" }, s);
    enqueue({ id: "good" }, s);
    const r = await flush(async (b) => { if (b.id === "bad") throw new Error("Invalid"); }, s);
    expect(r.sent).toBe(1);
    expect(r.refused.map((x) => x.batch.id)).toEqual(["bad"]);
    expect(r.left).toBe(0);
  });

  it.each([429, 500, 503])("keeps the queue on a %i and tries again later", async (status) => {
    const s = memory();
    enqueue({ id: "a" }, s);
    enqueue({ id: "b" }, s);
    const r = await flush(async () => { throw Object.assign(new Error("later"), { status }); }, s);
    expect(r).toEqual({ sent: 0, refused: [], left: 2 });
    expect(pending(s).map((x) => x.batch.id)).toEqual(["a", "b"]);
  });

  it("survives broken storage", async () => {
    const s = { getItem: () => "not json", setItem: () => { throw new Error("full"); } };
    expect(pending(s)).toEqual([]);
    expect(enqueue({ id: "x" }, s)).toBe(1);
    expect(pending(undefined)).toEqual([]);
  });

  it("tells a lost connection from a refusal", () => {
    expect(isOffline(new TypeError("Failed to fetch"))).toBe(true);
    expect(isOffline(Object.assign(new Error("x"), { status: 400 }))).toBe(false);
  });
});
