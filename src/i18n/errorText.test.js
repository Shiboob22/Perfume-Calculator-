import { describe, it, expect } from "vitest";
import { errorText } from "./errorText";
import { createTranslator } from "./core";
import en from "./messages/en";
import ar from "./messages/ar";

const t = createTranslator("ar", { en, ar });

describe("errorText", () => {
  it("translates a known error code", () => {
    expect(errorText(t, Object.assign(new Error("This fragrance already has a photo."), { code: "photo_exists" }))).toBe("لهذا العطر صورة بالفعل.");
  });
  it("falls back to the error's own message for unknown codes", () => {
    expect(errorText(t, Object.assign(new Error("Server said no"), { code: "something_else" }))).toBe("Server said no");
  });
  it("uses the fallback key when there is no message", () => {
    expect(errorText(t, {}, "batches.loadFailed")).toBe("تعذّر تحميل سجل الدفعات.");
  });
});
