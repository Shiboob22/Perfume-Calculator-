import { describe, it, expect } from "vitest";
import { pourProgress } from "./pourProgress.js";

describe("pourProgress", () => {
  it("is under until the target band", () => {
    expect(pourProgress(0, 23.75)).toEqual({ fraction: 0, state: "under" });
    expect(pourProgress(12, 24)).toEqual({ fraction: 0.5, state: "under" });
  });
  it("is ok within the tolerance of the target, either side", () => {
    expect(pourProgress(23.75, 23.75).state).toBe("ok");
    expect(pourProgress(23, 23.75).state).toBe("ok"); // −3.2 %
    expect(pourProgress(24.5, 23.75).state).toBe("ok"); // +3.2 %
  });
  it("is over past the band, and the bar stays full", () => {
    expect(pourProgress(26, 23.75)).toEqual({ fraction: 1, state: "over" });
  });
  it("takes a tolerance of 0 literally", () => {
    expect(pourProgress(23.74, 23.75, 0).state).toBe("under");
    expect(pourProgress(23.75, 23.75, 0).state).toBe("ok");
  });
  it("never reaches a target of zero or less, or a non-number", () => {
    expect(pourProgress(5, 0)).toEqual({ fraction: 0, state: "under" });
    expect(pourProgress(5, -1)).toEqual({ fraction: 0, state: "under" });
    expect(pourProgress(NaN, 10)).toEqual({ fraction: 0, state: "under" });
  });
});
