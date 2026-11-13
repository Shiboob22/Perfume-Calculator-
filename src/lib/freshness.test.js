import { describe, it, expect, vi } from "vitest";
import { shouldReload, busy, checkForUpdate, VERSION_URL } from "./freshness";

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const answer = (body, ok = true) => vi.fn(async () => ({ ok, json: async () => body }));
const doc = (over = {}) => ({ querySelector: () => null, activeElement: null, ...over });

describe("shouldReload", () => {
  it("only for a different, real release, once", () => {
    expect(shouldReload({ built: "aaa1111", live: "bbb2222", reloadedFor: null })).toBe(true);
    expect(shouldReload({ built: "aaa1111", live: "aaa1111" })).toBe(false);
    expect(shouldReload({ built: "aaa1111", live: "bbb2222", reloadedFor: "bbb2222" })).toBe(false);
    expect(shouldReload({ built: "local", live: "bbb2222" })).toBe(false);
    expect(shouldReload({ built: "", live: "bbb2222" })).toBe(false);
    expect(shouldReload({ built: "aaa1111", live: null })).toBe(false);
    expect(shouldReload({ built: "aaa1111", live: 5 })).toBe(false);
  });
});

describe("busy", () => {
  it("an open sheet or a focused field waits", () => {
    expect(busy(doc({ querySelector: (s) => (s === "dialog[open]" ? {} : null) }))).toBe(true);
    for (const tagName of ["INPUT", "TEXTAREA", "SELECT"]) expect(busy(doc({ activeElement: { tagName } }))).toBe(true);
    expect(busy(doc({ activeElement: { tagName: "DIV", isContentEditable: true } }))).toBe(true);
    expect(busy(doc({ activeElement: { tagName: "BUTTON" } }))).toBe(false);
    expect(busy(doc())).toBe(false);
    expect(busy(null)).toBe(false);
  });
});

describe("checkForUpdate", () => {
  it("reloads once onto a newer release, after updating the worker", async () => {
    const storage = memory();
    const reload = vi.fn();
    const updateWorker = vi.fn(async () => {});
    const fetchFn = answer({ release: "bbb2222" });
    expect(await checkForUpdate({ built: "aaa1111", fetchFn, storage, doc: doc(), reload, updateWorker })).toBe("reloading");
    expect(fetchFn).toHaveBeenCalledWith(VERSION_URL, { cache: "no-store" });
    expect(updateWorker).toHaveBeenCalled();
    expect(reload).toHaveBeenCalledTimes(1);
    // The old page came back again: no second reload for the same release.
    expect(await checkForUpdate({ built: "aaa1111", fetchFn, storage, doc: doc(), reload })).toBe("skipped");
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it("stays when current, offline, refused or busy", async () => {
    const reload = vi.fn();
    expect(await checkForUpdate({ built: "aaa1111", fetchFn: answer({ release: "aaa1111" }), storage: memory(), doc: doc(), reload })).toBe("current");
    expect(await checkForUpdate({ built: "aaa1111", fetchFn: vi.fn(async () => { throw new Error("offline"); }), storage: memory(), doc: doc(), reload })).toBe("failed");
    expect(await checkForUpdate({ built: "aaa1111", fetchFn: answer({}, false), storage: memory(), doc: doc(), reload })).toBe("failed");
    expect(await checkForUpdate({ built: "aaa1111", fetchFn: answer({ release: "bbb2222" }), storage: memory(), doc: doc({ activeElement: { tagName: "INPUT" } }), reload })).toBe("busy");
    expect(reload).not.toHaveBeenCalled();
  });
  it("blocked storage and a failing worker update still reload once", async () => {
    const reload = vi.fn();
    const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    const r = await checkForUpdate({ built: "aaa1111", fetchFn: answer({ release: "bbb2222" }), storage: blocked, doc: doc(), reload, updateWorker: async () => { throw new Error("x"); } });
    expect(r).toBe("reloading");
    expect(reload).toHaveBeenCalledTimes(1);
    expect(await checkForUpdate({ built: "aaa1111", fetchFn: answer(null), storage: null, doc: doc(), reload })).toBe("skipped");
  });
});
