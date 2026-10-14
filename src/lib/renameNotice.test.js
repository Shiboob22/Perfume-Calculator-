import { describe, it, expect } from "vitest";
import { renameNoticeVisible } from "./renameNotice.js";

const cfg = { renameNoticeFrom: "2026-10-14", renameNoticeDays: 60 };
const at = (iso) => new Date(`${iso}T12:00:00Z`);

describe("renameNoticeVisible", () => {
  it("shows from the first day for 60 days", () => {
    expect(renameNoticeVisible(at("2026-10-14"), false, cfg)).toBe(true);
    expect(renameNoticeVisible(at("2026-12-12"), false, cfg)).toBe(true); // day 59
  });
  it("stops after 60 days", () => {
    expect(renameNoticeVisible(at("2026-12-14"), false, cfg)).toBe(false);
  });
  it("is not shown before the rebrand ships", () => {
    expect(renameNoticeVisible(at("2026-10-13"), false, cfg)).toBe(false);
  });
  it("stays hidden once dismissed", () => {
    expect(renameNoticeVisible(at("2026-10-20"), true, cfg)).toBe(false);
  });
});
