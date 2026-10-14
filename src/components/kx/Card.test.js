import { describe, it, expect } from "vitest";
import { catalogueNumber } from "./Card.jsx";

describe("catalogueNumber", () => {
  it("pads to three digits", () => {
    expect(catalogueNumber(15)).toBe("No. 015");
    expect(catalogueNumber(0)).toBe("No. 000");
    expect(catalogueNumber(1234)).toBe("No. 1234");
  });
  it("copes with junk", () => {
    expect(catalogueNumber("7")).toBe("No. 007");
    expect(catalogueNumber(-3)).toBe("No. 000");
    expect(catalogueNumber(undefined)).toBe("No. 000");
  });
});
