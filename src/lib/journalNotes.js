// Saving a Journal note, shared by the note editor and the quick-note sheet:
// sent now when there is a connection, otherwise kept in the outbox and sent
// when it returns (the same client id, so a retry is never a second note).
// A "not now" from the server (429, 5xx) is kept the same way: the outbox
// sends it again later, so an optimistic save never loses the note.
import { upsertNote } from "./benchApi";
import { enqueueCheckIn, isOffline, isRetryable } from "./outbox";

/** Resolves { checkin, queued }; throws when the server refuses the note. */
export async function saveNote(draft) {
  try {
    return { checkin: await upsertNote(draft), queued: false };
  } catch (e) {
    if (!isOffline(e) && !isRetryable(e)) throw e;
    enqueueCheckIn({ ...draft, upsert: true });
    return { checkin: { ...draft, created_at: new Date().toISOString() }, queued: true };
  }
}

/** The tasting tags (stored as these keys, so old notes keep reading). */
export { TAGS } from "./noteTags";
