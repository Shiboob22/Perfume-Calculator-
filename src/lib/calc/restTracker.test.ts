import { describe, it, expect } from "vitest";
import {
  MILESTONES, REST_DAYS, milestoneIndex, notesByMilestone, milestoneDots, restProgress, trackPosition, readySoonOrder, isFresh, DOT_GLYPH,
} from "./index";

const n = (id: string, day: number, extra = {}) => ({ id, day, note: "x", ...extra });

describe("rest tracker milestones", () => {
  it("five milestones over 90 days", () => {
    expect(MILESTONES.map((m) => m.days)).toEqual([0, 7, 14, 30, 90]);
    expect(REST_DAYS).toBe(90);
  });
  it("a day falls under the last milestone reached", () => {
    expect([0, 6, 7, 13, 14, 29, 30, 89, 90, 400].map(milestoneIndex)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });
});

describe("notes by milestone", () => {
  it("a note made for a milestone's day is that milestone's", () => {
    const notes = notesByMilestone([n("a", 9, { scheduled_day: 7 }), n("b", 31, { scheduled_day: 30 })]);
    expect(notes.w1?.id).toBe("a");
    expect(notes.m1?.id).toBe("b");
    expect(notes.d1).toBeUndefined();
  });
  it("older notes land in their stretch; the latest wins; an exact one beats them", () => {
    const notes = notesByMilestone([
      n("day1", 1, { scheduled_day: 1, created_at: "2026-10-02" }),
      n("adhoc", 3, { created_at: "2026-10-04" }),
      n("fam", 20, { scheduled_day: 42, created_at: "2026-11-12" }),
      n("w2-old", 15, { created_at: "2026-10-16" }),
      n("w2-exact", 14, { scheduled_day: 14, created_at: "2026-10-15" }),
      n("w2-after", 16, { created_at: "2026-10-17" }),
    ]);
    expect(notes.d1?.id).toBe("adhoc");
    expect(notes.w2?.id).toBe("w2-exact");
    expect(notes.m1?.id).toBe("fam"); // a family point at day 42 is in Month 1's stretch
  });
  it("skips are not notes; nothing in, nothing out", () => {
    expect(notesByMilestone([{ id: "s", day: 7, scheduled_day: 7, skipped: true }])).toEqual({});
    expect(notesByMilestone(null)).toEqual({});
    expect(notesByMilestone([{ id: "q", day: 2, note: "x" }, { id: "r", day: 3, note: "y" }]).d1?.id).toBe("r");
  });
});

describe("dots, progress and the track", () => {
  it("● note, ○ reached, · future", () => {
    expect(milestoneDots([n("a", 0, { scheduled_day: 0 })], 15)).toEqual(["note", "reached", "reached", "future", "future"]);
    expect(milestoneDots([], 0).map((d) => DOT_GLYPH[d]).join(" ")).toBe("○ · · · ·");
  });
  it("progress over 90 days", () => {
    expect(restProgress(12)).toEqual({ day: 12, left: 78, ready: false, fraction: 12 / 90 });
    expect(restProgress(120)).toEqual({ day: 90, left: 0, ready: true, fraction: 1 });
    expect(restProgress(-3).day).toBe(0);
  });
  it("today sits between the evenly spaced milestones", () => {
    expect(trackPosition(0)).toBe(0);
    expect(trackPosition(7)).toBeCloseTo(0.25, 12);
    expect(trackPosition(22)).toBeCloseTo((2 + 8 / 16) / 4, 12);
    expect(trackPosition(60)).toBeCloseTo((3 + 0.5) / 4, 12);
    expect(trackPosition(90)).toBe(1);
    expect(trackPosition(-1)).toBe(0);
  });
});

describe("ready soon and new", () => {
  it("nearest first, ready last", () => {
    const order = readySoonOrder([{ id: "a", day: 10 }, { id: "b", day: 95 }, { id: "c", day: 80 }, { id: "d", day: 90 }, { id: "e", day: 10 }]);
    expect(order.map((x) => x.id)).toEqual(["c", "a", "e", "b", "d"]);
  });
  it("new: logged in the last 48 hours and not noted yet", () => {
    const now = new Date("2026-11-05T12:00:00Z");
    expect(isFresh("2026-11-04T13:00:00Z", [], now)).toBe(true);
    expect(isFresh("2026-11-03T11:00:00Z", [], now)).toBe(false);
    expect(isFresh("2026-11-05T11:00:00Z", [{ id: "x", day: 0, note: "a" }], now)).toBe(false);
    expect(isFresh("2026-11-05T11:00:00Z", [{ id: "x", day: 0, skipped: true }], now)).toBe(true);
    expect(isFresh(null, [], now)).toBe(false);
    expect(isFresh("nope", [], now)).toBe(false);
    expect(isFresh("2026-11-06T12:00:00Z", undefined, now)).toBe(false);
    expect(isFresh("2026-11-05T11:00:00Z", undefined, now)).toBe(true);
  });
});
