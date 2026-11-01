import { describe, it, expect } from "vitest";
import { fitSize, prepareProof } from "./proof";

describe("fitSize", () => {
  it("shrinks the longer side to the limit, keeping the shape", () => {
    expect(fitSize(3200, 1600)).toEqual({ width: 1600, height: 800 });
    expect(fitSize(1000, 4000, 2000)).toEqual({ width: 500, height: 2000 });
  });
  it("never enlarges", () => {
    expect(fitSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe("prepareProof", () => {
  it("refuses a file that is not a JPEG, PNG or WebP", async () => {
    await expect(prepareProof({ type: "application/pdf", size: 10 })).rejects.toEqual({ code: "bad_proof" });
    await expect(prepareProof(null)).rejects.toEqual({ code: "bad_proof" });
  });
});
