import { describe, it, expect } from "vitest";
import { actualStrength } from "./history";
import { round2 } from "./round";

const planned = { oil_g: 23.75, oil_ml: 25, ethanol_g: 60.75, ethanol_ml: 75 };

describe("actualStrength", () => {
  it("is null without a recorded pour", () => {
    expect(actualStrength(planned)).toBeNull();
    expect(actualStrength({ ...planned, actual_oil_g: 23.75 })).toBeNull();
  });
  it("uses the stored basis and densities", () => {
    const v = actualStrength({ ...planned, actual_oil_g: "23.75", actual_ethanol_g: "60.75", basis: "volume", oil_density: 0.95, ethanol_density: 0.81 });
    expect(v && [round2(v.pct), v.basis, v.basisKnown]).toEqual([25, "volume", true]);
    const w = actualStrength({ ...planned, actual_oil_g: 25, actual_ethanol_g: 75, basis: "weight" });
    expect(w && [w.pct, w.basis, w.basisKnown]).toEqual([25, "weight", true]);
  });
  it("reads old batches as by volume from their planned numbers, and says the basis is unknown", () => {
    const old = actualStrength({ ...planned, actual_oil_g: 23.75, actual_ethanol_g: 60.75 });
    expect(old && [round2(old.pct), old.basisKnown]).toEqual([25, false]);
    const odd = actualStrength({ oil_g: 0, oil_ml: 0, ethanol_g: 0, ethanol_ml: 0, actual_oil_g: 1, actual_ethanol_g: 1 });
    expect(odd?.pct).toBe(50);
  });
});
