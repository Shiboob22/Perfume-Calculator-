import { describe, expect, it } from "vitest";
import { errorPayload } from "./reportError";

describe("errorPayload", () => {
  it("keeps what helps debugging and drops the query and hash", () => {
    const err = new TypeError("x is undefined");
    const p = errorPayload(err, { path: "/app/calculator?size=50#access_token=secret", componentStack: "in Calc" });
    expect(p).toMatchObject({ message: "x is undefined", name: "TypeError", path: "/app/calculator", componentStack: "in Calc" });
    expect(JSON.stringify(p)).not.toContain("secret");
  });

  it("caps sizes and copes with non-errors", () => {
    const p = errorPayload("m".repeat(900));
    expect(p.message).toHaveLength(500);
    expect(p.name).toBe("Error");
    expect(errorPayload(undefined).message).toBe("Unknown error");
  });
});
