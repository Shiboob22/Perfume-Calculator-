// Batches logged while offline wait here (in this browser) and are sent when
// the connection returns. Each carries its own id, so a retry after a send
// that did reach the server can't create a duplicate (the API treats a
// repeated id as already logged). Journal check-ins queue here too, in the
// same list, so a check-in is always sent after the batch it belongs to.
const KEY = "sh-outbox";
const REFUSED_KEY = "sh-outbox-refused";

function read(storage, key = KEY) {
  try {
    const list = JSON.parse(storage.getItem(key) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(storage, list, key = KEY) {
  try { storage.setItem(key, JSON.stringify(list)); } catch {}
}

export function pending(storage = globalThis.localStorage) {
  return storage ? read(storage) : [];
}

export function enqueue(batch, storage = globalThis.localStorage) {
  const list = read(storage);
  list.push({ batch, queuedAt: new Date().toISOString() });
  write(storage, list);
  return list.length;
}

export function enqueueCheckIn(checkin, storage = globalThis.localStorage) {
  const list = read(storage);
  list.push({ checkin, queuedAt: new Date().toISOString() });
  write(storage, list);
  return list.length;
}

// A failure that means "no connection", as opposed to the server refusing.
export function isOffline(err) {
  return err instanceof TypeError || err?.name === "TypeError" || (typeof navigator !== "undefined" && navigator.onLine === false);
}

// "Not now" answers from the server: too many requests (429), or a
// server-side failure (5xx, e.g. the database slow to respond). The batch
// is fine; send it again later.
export function isRetryable(err) {
  return err?.status === 429 || err?.status >= 500;
}

/**
 * Send queued items in order: batches with `send(batch)` (or `send.batch`),
 * check-ins with `send.checkin`. Stops at the first connection failure or
 * "not now" answer (and keeps the rest); takes out an item the server
 * refuses outright, so one bad entry can't block the queue forever. A
 * refused batch is kept aside (see refusedBatches); a refused check-in, a
 * line of text, is let go. Returns counts.
 */
export async function flush(send, storage = globalThis.localStorage) {
  const senders = typeof send === "function" ? { batch: send } : send;
  let list = read(storage);
  let sent = 0;
  const refused = [];
  while (list.length) {
    const [item, ...rest] = list;
    const kind = item.checkin ? "checkin" : "batch";
    if (!senders[kind]) break;
    try {
      await senders[kind](item[kind]);
      sent += 1;
    } catch (err) {
      if (isOffline(err) || isRetryable(err) || needsSignIn(err)) break;
      if (kind === "batch") refused.push({ ...item, code: err?.code || null, error: err?.message || String(err) });
    }
    list = rest;
    write(storage, list);
  }
  if (refused.length) write(storage, [...read(storage, REFUSED_KEY), ...refused], REFUSED_KEY);
  return { sent, refused, left: list.length };
}

// No session (signed out, or it expired while offline): the batch is fine,
// it just can't be sent as anyone yet. Keep it until the user signs in.
export function needsSignIn(err) {
  return err?.code === "not_authenticated" || err?.status === 401;
}

// Batches the server refused outright (e.g. the plan's batch cap), kept so
// the weights the user recorded are never thrown away unseen.
export function refusedBatches(storage = globalThis.localStorage) {
  return storage ? read(storage, REFUSED_KEY) : [];
}

export function dismissRefused(id, storage = globalThis.localStorage) {
  const list = read(storage, REFUSED_KEY).filter((item) => item.batch?.id !== id);
  write(storage, list, REFUSED_KEY);
  return list;
}
