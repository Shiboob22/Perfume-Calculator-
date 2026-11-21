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
  it("is not shown to an account made after the rename", () => {
    expect(renameNoticeVisible(at("2026-10-20"), false, cfg, "2026-10-15T09:00:00Z")).toBe(false);
    expect(renameNoticeVisible(at("2026-10-20"), false, cfg, "2026-10-14T00:00:00Z")).toBe(false);
  });
  it("is shown to an older account, and when the creation time is unknown", () => {
    expect(renameNoticeVisible(at("2026-10-20"), false, cfg, "2026-09-27T09:00:00Z")).toBe(true);
    expect(renameNoticeVisible(at("2026-10-20"), false, cfg, undefined)).toBe(true);
  });
  it("stays hidden once dismissed", () => {
    expect(renameNoticeVisible(at("2026-10-20"), true, cfg)).toBe(false);
  });
});
