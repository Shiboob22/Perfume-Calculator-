import { describe, it, expect } from "vitest";
import { restDay, checkInSchedule, dueCheckIns, peakDay, peakPattern, type CheckIn } from "./journal";

const DAY = 24 * 60 * 60 * 1000;
const start = new Date(2026, 0, 1, 9, 0);
const on = (d: number, hours = 0) => new Date(start.getTime() + d * DAY + hours * 3600_000);

describe("restDay", () => {
  it("counts whole days since the start", () => {
    expect(restDay(start, start)).toBe(0);
    expect(restDay(start, on(0, 23))).toBe(0);
    expect(restDay(start, on(1))).toBe(1);
    expect(restDay(start, on(27, 12))).toBe(27);
  });
  it("never goes negative (a start in the future)", () => {
    expect(restDay(on(3), start)).toBe(0);
  });
});

describe("checkInSchedule", () => {
  it.each([
    ["fresh", [7, 14], [1, 7, 14, 28]],
    ["floral", [14, 21], [1, 14, 21, 35]],
    ["woody", [21, 28], [1, 21, 28, 42]],
    ["oriental", [28, 42], [1, 28, 42, 56]],
  ] as const)("%s: day 1, rest start, rest end, end + 14", (_, rest, days) => {
    const s = checkInSchedule(rest);
    expect(s.map((p) => p.day)).toEqual(days);
    // Each point is due until the next opens; the last for a week.
    expect(s.map((p) => p.until)).toEqual([...days.slice(1), days[3] + 7]);
  });
  it("merges points that coincide and drops a day-0 start", () => {
    expect(checkInSchedule([1, 1]).map((p) => p.day)).toEqual([1, 15]);
    expect(checkInSchedule([0, 7]).map((p) => p.day)).toEqual([1, 7, 21]);
  });
});

describe("dueCheckIns", () => {
  const batch = { id: "b1", startedAt: start, rest: [21, 28] as const };

  it("finds the point whose window holds today", () => {
    expect(dueCheckIns([batch], [], on(1))).toEqual([{ batchId: "b1", scheduledDay: 1, day: 1 }]);
    expect(dueCheckIns([batch], [], on(20))).toEqual([{ batchId: "b1", scheduledDay: 1, day: 20 }]);
    expect(dueCheckIns([batch], [], on(23))).toEqual([{ batchId: "b1", scheduledDay: 21, day: 23 }]);
    expect(dueCheckIns([batch], [], on(48))).toEqual([{ batchId: "b1", scheduledDay: 42, day: 48 }]);
  });
  it("nothing before day 1 or after the last window (old batches stay quiet)", () => {
    expect(dueCheckIns([batch], [], on(0, 20))).toEqual([]);
    expect(dueCheckIns([batch], [], on(49))).toEqual([]);
    expect(dueCheckIns([batch], [], on(400))).toEqual([]);
  });
  it("an answered or skipped point is no longer due; ad hoc ones don't count", () => {
    const answered: CheckIn[] = [{ batch_id: "b1", day: 22, scheduled_day: 21, rating: 4 }];
    expect(dueCheckIns([batch], answered, on(23))).toEqual([]);
    const skipped: CheckIn[] = [{ batch_id: "b1", day: 22, scheduled_day: 21, skipped: true }];
    expect(dueCheckIns([batch], skipped, on(23))).toEqual([]);
    const adHoc: CheckIn[] = [{ batch_id: "b1", day: 22, scheduled_day: null, rating: 4 }];
    expect(dueCheckIns([batch], adHoc, on(23))).toHaveLength(1);
    const otherBatch: CheckIn[] = [{ batch_id: "b2", day: 22, scheduled_day: 21, rating: 4 }];
    expect(dueCheckIns([batch], otherBatch, on(23))).toHaveLength(1);
  });
  it("skips batches without a start or a known family", () => {
    expect(dueCheckIns([{ id: "x", startedAt: null, rest: [7, 14] }, { id: "y", startedAt: start, rest: undefined }], [], on(1))).toEqual([]);
  });
});

describe("peakDay", () => {
  const c = (day: number, rating: number | null, extra: Partial<CheckIn> = {}): CheckIn => ({ batch_id: "b", day, rating, ...extra });

  it("is the earliest day that reached the best rating", () => {
    expect(peakDay([c(1, 2), c(21, 4), c(28, 5), c(42, 3)])).toBe(28);
    expect(peakDay([c(1, 3), c(21, 5), c(28, 5), c(42, 5)])).toBe(21);
  });
  it("can be day 1 when the blend only got worse", () => {
    expect(peakDay([c(1, 5), c(21, 3)])).toBe(1);
  });
  it("counts ad-hoc check-ins and ignores skips and unrated notes", () => {
    expect(peakDay([c(1, 2), c(16, 5, { scheduled_day: null }), c(21, null), c(28, null, { skipped: true })])).toBe(16);
    expect(peakDay([c(1, 2), c(21, 5, { skipped: true }), c(28, 3)])).toBe(28);
  });
  it("needs two ratings, one of them after day 1", () => {
    expect(peakDay([])).toBeNull();
    expect(peakDay([c(28, 5)])).toBeNull();
    expect(peakDay([c(0, 3), c(1, 5)])).toBeNull();
    expect(peakDay([c(1, 3), c(28, null)])).toBeNull();
  });
});

describe("peakPattern", () => {
  const batch = (peak: number): CheckIn[] => [
    { batch_id: "b", day: 1, rating: 2 },
    { batch_id: "b", day: peak, rating: 5 },
  ];

  it("needs three batches with a peak", () => {
    expect(peakPattern([batch(21), batch(28)])).toBeNull();
    expect(peakPattern([batch(21), batch(28), [{ batch_id: "b", day: 1, rating: 4 }]])).toBeNull();
  });
  it("odd count: the middle peak, with the spread and the count", () => {
    expect(peakPattern([batch(28), batch(21), batch(42)])).toEqual({ day: 28, min: 21, max: 42, batches: 3 });
  });
  it("even count: the mean of the middle two, rounded to a day", () => {
    expect(peakPattern([batch(21), batch(24), batch(27), batch(42)])).toEqual({ day: 26, min: 21, max: 42, batches: 4 });
  });
});
