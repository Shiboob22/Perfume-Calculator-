import { describe, it, expect } from "vitest";
import { readyCountdown, batchReadyAt, formatExact } from "./batchTiming";

const now = new Date(2026, 8, 27, 12, 0);

describe("readyCountdown", () => {
  it("reports ready once the time has passed", () => {
    expect(readyCountdown(new Date(2026, 8, 27, 11, 0), now)).toEqual({ key: "ready" });
  });
  it("counts whole days, then hours on the last day", () => {
    expect(readyCountdown(new Date(2026, 9, 9, 12, 0), now)).toEqual({ key: "inDays", count: 12 });
    expect(readyCountdown(new Date(2026, 8, 27, 17, 0), now)).toEqual({ key: "inHours", count: 5 });
  });
  it("returns null without a date", () => {
    expect(readyCountdown(null, now)).toBeNull();
  });
});

describe("batchReadyAt", () => {
  it("adds the family's maximum rest days to the blend date", () => {
    const ready = batchReadyAt({ blend_date: "2026-09-01", tier: "fresh" });
    expect(ready.getFullYear()).toBe(2026);
    expect([ready.getMonth(), ready.getDate()]).toEqual([8, 15]); // +14 days
  });
});

describe("formatExact", () => {
  it("uses Western digits in Arabic", () => {
    expect(formatExact(now, "ar")).toMatch(/2026/);
    expect(formatExact(now, "ar")).not.toMatch(/[٠-٩]/);
  });
});
