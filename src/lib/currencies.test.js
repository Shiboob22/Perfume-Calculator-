import { describe, it, expect } from "vitest";
import { currencyLabel } from "./currencies.js";

describe("currencyLabel", () => {
  it("keeps the code in English", () => expect(currencyLabel("EGP", "en")).toBe("EGP"));
  it("uses the Arabic sign in Arabic", () => expect(currencyLabel("EGP", "ar")).toBe("ج.م."));
  it("falls back to the code for an unknown currency", () => expect(currencyLabel("XYZ1", "ar")).toBe("XYZ1"));
  it("is empty with no currency", () => expect(currencyLabel(null, "ar")).toBe(""));
});
