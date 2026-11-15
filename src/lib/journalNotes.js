// Saving a Journal note, shared by the note editor and the quick-note sheet:
// sent now when there is a connection, otherwise kept in the outbox and sent
// when it returns (the same client id, so a retry is never a second note).
import { upsertNote } from "./benchApi";
import { enqueueCheckIn, isOffline } from "./outbox";

/** Resolves { checkin, queued }; throws when the server refuses the note. */
export async function saveNote(draft) {
  try {
    return { checkin: await upsertNote(draft), queued: false };
  } catch (e) {
    if (!isOffline(e)) throw e;
    enqueueCheckIn({ ...draft, upsert: true });
    return { checkin: { ...draft, created_at: new Date().toISOString() }, queued: true };
  }
}

/** The tasting tags (stored as these keys, so old notes keep reading). */
export const TAGS = ["harsh", "sharp", "rounder", "sweeter", "woodier", "fading", "ready"];
