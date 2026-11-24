import { describe, it, expect } from "vitest";
import qrcode from "qrcode-generator";
import { qrSvg, buyerUrl } from "./qr";

describe("bottle QR", () => {
  it("points at the buyer page", () => {
    expect(buyerUrl("https://kyphira.example/", "ab12")).toBe("https://kyphira.example/o/ab12");
  });
  it("draws every dark module of the code, inside a quiet zone", () => {
    const url = buyerUrl("https://scent-handbook-app.vercel.app", "0123456789abcdef0123456789abcdef");
    const { size, d } = qrSvg(url);
    const ref = qrcode(0, "M"); ref.addData(url); ref.make();
    const n = ref.getModuleCount();
    expect(size).toBe(n + 4);
    let dark = 0;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (ref.isDark(r, c)) dark++;
    expect(d.match(/M/g)).toHaveLength(dark);
    expect(d.startsWith("M2 2h1v1h-1z")).toBe(true); // the top-left finder starts at the quiet zone's edge
  });
});
