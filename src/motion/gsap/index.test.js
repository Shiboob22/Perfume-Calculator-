import { describe, it, expect } from "vitest";
import * as kit from "./index.js";

describe("gsap kit barrel", () => {
  it("exports the public functions", () => {
    for (const n of ["useRoomScene", "useFlipList", "useSceneCtx", "useGsap", "loadGsap", "peekGsap", "stubGsap", "assertSceneRules", "runScene", "registerEases"]) {
      expect(typeof kit[n], n).toBe("function");
    }
  });
});
