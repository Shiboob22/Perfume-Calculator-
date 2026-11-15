import { describe, it, expect } from "vitest";
import { keyToBytes } from "./push";

describe("keyToBytes", () => {
  it("turns the base64url public key into the 65 bytes pushManager.subscribe takes", () => {
    const point = Uint8Array.from([4, ...Array.from({ length: 64 }, (_, i) => (i * 7 + 250) % 256)]);
    const b64url = btoa(String.fromCharCode(...point)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const bytes = keyToBytes(b64url);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(65);
    expect([...bytes]).toEqual([...point]);
  });
  it("handles keys whose length needs padding", () => {
    expect([...keyToBytes("AQID")]).toEqual([1, 2, 3]);
    expect([...keyToBytes("AQI")]).toEqual([1, 2]);
  });
});
