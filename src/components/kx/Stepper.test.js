import { describe, expect, it } from "vitest";
import { stepValue } from "./Stepper.jsx";

describe("stepValue", () => {
  it("steps by the increment and keeps its decimals", () => {
    expect(stepValue("14.00", 0.25, { step: 0.25 })).toBe("14.25");
    expect(stepValue("14", -0.25, { step: 0.25 })).toBe("13.75");
    expect(stepValue("100", 10, { step: 10 })).toBe("110");
  });
  it("clamps to the range and treats a blank as zero", () => {
    expect(stepValue("0", -1, { step: 1, min: 0 })).toBe("0");
    expect(stepValue("99", 5, { step: 1, max: 100 })).toBe("100");
    expect(stepValue("", 1, { step: 1 })).toBe("1");
  });
  it("accepts a decimal comma", () => {
    expect(stepValue("1,5", 0.5, { step: 0.5 })).toBe("2.0");
  });
});
