import { describe, it, expect } from "vitest";
import { enqueue, enqueueCheckIn, pending, flush, isOffline, refusedBatches, dismissRefused } from "./outbox";

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

  it("moves a batch the server refuses to the refused list and carries on", async () => {
    const s = memory();
    enqueue({ id: "bad" }, s);
    enqueue({ id: "good" }, s);
    const r = await flush(async (b) => { if (b.id === "bad") throw Object.assign(new Error("cap"), { status: 403, code: "batch_cap" }); }, s);
    expect(r.sent).toBe(1);
    expect(r.refused.map((x) => x.batch.id)).toEqual(["bad"]);
    expect(r.left).toBe(0);
    expect(refusedBatches(s)).toMatchObject([{ batch: { id: "bad" }, code: "batch_cap" }]);
    expect(dismissRefused("bad", s)).toEqual([]);
    expect(refusedBatches(s)).toEqual([]);
  });

  it.each([
    ["no session", Object.assign(new Error("Not authenticated"), { code: "not_authenticated" })],
    ["a 401", Object.assign(new Error("Unauthorized"), { status: 401 })],
  ])("keeps the queue on %s until the user signs in", async (_, err) => {
    const s = memory();
    enqueue({ id: "a" }, s);
    const r = await flush(async () => { throw err; }, s);
    expect(r).toEqual({ sent: 0, refused: [], left: 1 });
    expect(refusedBatches(s)).toEqual([]);
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

describe("check-ins in the outbox", () => {
  it("sends batches and check-ins in the order they were queued", async () => {
    const storage = memory();
    enqueue({ id: "b1" }, storage);
    enqueueCheckIn({ id: "c1", batch_id: "b1" }, storage);
    const order = [];
    const r = await flush({ batch: async (b) => order.push(b.id), checkin: async (c) => order.push(c.id) }, storage);
    expect(order).toEqual(["b1", "c1"]);
    expect(r).toEqual({ sent: 2, refused: [], left: 0 });
  });
  it("keeps check-ins when only a batch sender is given", async () => {
    const storage = memory();
    enqueueCheckIn({ id: "c1" }, storage);
    const r = await flush(async () => {}, storage);
    expect(r.left).toBe(1);
    expect(pending(storage)).toHaveLength(1);
  });
  it("lets a refused check-in go without listing it as a refused batch", async () => {
    const storage = memory();
    enqueueCheckIn({ id: "c1" }, storage);
    enqueue({ id: "b2" }, storage);
    const r = await flush({ batch: async () => {}, checkin: async () => { throw Object.assign(new Error("cap"), { status: 403 }); } }, storage);
    expect(r).toEqual({ sent: 1, refused: [], left: 0 });
    expect(refusedBatches(storage)).toEqual([]);
  });
  it("keeps a check-in for later when offline", async () => {
    const storage = memory();
    enqueueCheckIn({ id: "c1" }, storage);
    const r = await flush({ checkin: async () => { throw new TypeError("Failed to fetch"); } }, storage);
    expect(r.left).toBe(1);
  });
});
