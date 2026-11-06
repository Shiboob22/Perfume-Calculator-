import { describe, it, expect } from "vitest";
import {
  MILESTONES, REST_DAYS, milestoneIndex, notesByMilestone, milestoneDots, restProgress, trackPosition, readySoonOrder, isFresh, DOT_GLYPH, needsNote, JOURNAL_SORTS, journalSortKey, journalSort, journalSortDir, SORT_DEFAULT_DIR,
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

describe("journal sort", () => {
  const note = (scheduled_day: number, extra = {}) => ({ id: `n${scheduled_day}`, day: scheduled_day, scheduled_day, note: "x", ...extra });
  it("needs a note: the reached milestone, if it has none", () => {
    expect(needsNote([], 0)).toEqual({ k: "d1", left: 7 });
    expect(needsNote([note(0)], 3)).toBeNull();
    // Week 1 missed; at day 16 only Week 2 counts.
    expect(needsNote([note(0)], 16)).toEqual({ k: "w2", left: 14 });
    expect(needsNote([note(14)], 16)).toBeNull();
    // A skip is not a note.
    expect(needsNote([note(7, { skipped: true })], 8)).toEqual({ k: "w1", left: 6 });
    // Month 3 never closes.
    expect(needsNote(null, 120)).toEqual({ k: "m3", left: Infinity });
    expect(needsNote(undefined, -2)).toEqual({ k: "d1", left: 7 });
  });
  it("keys: known, else the default", () => {
    expect(JOURNAL_SORTS[0]).toBe("note");
    expect(journalSortKey("size")).toBe("size");
    expect(journalSortKey("bogus")).toBe("note");
    expect(journalSortKey(undefined)).toBe("note");
  });
  const rows = [
    { id: "a", no: 1, day: 120, ml: 50, start: 1000, checkins: [note(90)] },
    { id: "b", no: 2, day: 95, ml: 100, start: 2000, checkins: [] },
    { id: "c", no: 3, day: 12, ml: 30, start: 3000, checkins: [note(7)] },
    { id: "d", no: 4, day: 9, ml: 100, start: 4000, checkins: [] },
    { id: "e", no: 5, day: 0, ml: 10, start: NaN, checkins: null },
  ];
  const ids = (k: unknown) => journalSort(rows, k).map((x) => x.id);
  it("needs a note: closing soonest first, Month 3 last of the due, then newest", () => {
    // d owes Week 1 (5 days left), e Day 1 (7 left), b Month 3 (never closes); a and c are noted.
    expect(ids("note")).toEqual(["d", "e", "b", "c", "a"]);
    expect(ids("nonsense")).toEqual(ids("note"));
  });
  it("newest, maceration, size", () => {
    expect(ids("new")).toEqual(["e", "d", "c", "b", "a"]);
    // An unknown start sorts last.
    expect(ids("rest")).toEqual(["a", "b", "c", "d", "e"]);
    // Ties on size fall back to newest.
    expect(ids("size")).toEqual(["d", "b", "a", "c", "e"]);
  });
  it("two never-closing due batches tie on number", () => {
    const two = [{ no: 1, day: 100, ml: 1, start: 1 }, { no: 2, day: 91, ml: 1, start: 2 }];
    expect(journalSort(two, "note").map((x) => x.no)).toEqual([2, 1]);
    expect(journalSort([{ no: 1, day: 0, ml: NaN, start: 1 }, { no: 2, day: 0, ml: 5, start: 1 }], "size").map((x) => x.no)).toEqual([2, 1]);
  });
  it("directions: each sort's default, flipped, none for needs a note", () => {
    expect(SORT_DEFAULT_DIR).toEqual({ new: "desc", rest: "asc", size: "desc" });
    expect(journalSortDir("note", "asc")).toBeNull();
    expect(journalSortDir("bogus", "asc")).toBeNull();
    expect(journalSortDir("size", undefined)).toBe("desc");
    expect(journalSortDir("rest", "sideways")).toBe("asc");
    expect(journalSortDir("new", "asc")).toBe("asc");
    const ids2 = (k: unknown, d?: unknown) => journalSort(rows, k, d).map((x) => x.id);
    // Defaults equal the orders without a direction.
    expect(ids2("new", "desc")).toEqual(ids("new"));
    expect(ids2("rest", "asc")).toEqual(ids("rest"));
    expect(ids2("size", "desc")).toEqual(ids("size"));
    // Flipped: oldest first; just started first (unknown start still last); smallest first (ties newest first).
    expect(ids2("new", "asc")).toEqual(["a", "b", "c", "d", "e"]);
    expect(ids2("rest", "desc")).toEqual(["d", "c", "b", "a", "e"]);
    expect(ids2("size", "asc")).toEqual(["e", "c", "a", "d", "b"]);
    // Needs a note ignores a direction.
    expect(ids2("note", "asc")).toEqual(ids("note"));
    const odd = [{ no: 1, day: 0, ml: NaN, start: 1 }, { no: 2, day: 0, ml: 5, start: 1 }, { no: 3, day: 0, ml: NaN, start: 1 }];
    expect(journalSort(odd, "size", "asc").map((x) => x.no)).toEqual([2, 3, 1]);
  });
});

