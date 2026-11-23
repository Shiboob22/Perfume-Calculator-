import { afterEach, describe, expect, it, vi } from "vitest";
import { forgetAll, loadFailure, recall, remember } from "./lastLoaded.js";

describe("lastLoaded", () => {
  afterEach(() => { forgetAll(); vi.unstubAllGlobals(); });
  it("keeps the last list per key until sign-out forgets it", () => {
    expect(recall("journal")).toBe(null);
    remember("journal", [1]);
    remember("orders", [2]);
    expect(recall("journal")).toEqual([1]);
    forgetAll();
    expect(recall("orders")).toBe(null);
  });
  it("names an offline failure", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(loadFailure()).toBe("offline");
    vi.stubGlobal("navigator", { onLine: true });
    expect(loadFailure()).toBe("failed");
  });
});
