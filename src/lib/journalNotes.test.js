import { beforeEach, describe, expect, it, vi } from "vitest";

const upsertNote = vi.fn();
const enqueueCheckIn = vi.fn();
vi.mock("./benchApi", () => ({ upsertNote: (...a) => upsertNote(...a) }));
vi.mock("./outbox", async () => {
  const real = await vi.importActual("./outbox.js");
  return { isOffline: real.isOffline, isRetryable: real.isRetryable, enqueueCheckIn: (...a) => enqueueCheckIn(...a) };
});
const { saveNote } = await import("./journalNotes.js");

const draft = { id: "n1", batch_id: "b1", day: 7, scheduled_day: 7, note: "Rounder.", rating: 3, tags: [] };
const fail = (props) => Object.assign(new Error("x"), props);

describe("saveNote", () => {
  beforeEach(() => { upsertNote.mockReset(); enqueueCheckIn.mockReset(); });
  it("sends the note and returns the server's row", async () => {
    upsertNote.mockResolvedValue({ ...draft, created_at: "t" });
    await expect(saveNote(draft)).resolves.toEqual({ checkin: { ...draft, created_at: "t" }, queued: false });
    expect(enqueueCheckIn).not.toHaveBeenCalled();
  });
  it("keeps it on this phone when there is no connection", async () => {
    upsertNote.mockRejectedValue(new TypeError("Failed to fetch"));
    const r = await saveNote(draft);
    expect(r.queued).toBe(true);
    expect(enqueueCheckIn).toHaveBeenCalledWith({ ...draft, upsert: true });
  });
  it("keeps it too when the server says not now (429, 5xx), so an optimistic save loses nothing", async () => {
    for (const status of [429, 500, 503]) {
      upsertNote.mockRejectedValueOnce(fail({ status }));
      expect((await saveNote(draft)).queued).toBe(true);
    }
    expect(enqueueCheckIn).toHaveBeenCalledTimes(3);
  });
  it("throws when the server refuses the note", async () => {
    upsertNote.mockRejectedValue(fail({ status: 403 }));
    await expect(saveNote(draft)).rejects.toThrow();
    expect(enqueueCheckIn).not.toHaveBeenCalled();
  });
});
