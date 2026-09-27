// Batches logged while offline wait here (in this browser) and are sent when
// the connection returns. Each carries its own id, so a retry after a send
// that did reach the server can't create a duplicate (the API treats a
// repeated id as already logged).
const KEY = "sh-outbox";

function read(storage) {
  try {
    const list = JSON.parse(storage.getItem(KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(storage, list) {
  try { storage.setItem(KEY, JSON.stringify(list)); } catch {}
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

// A failure that means "no connection", as opposed to the server refusing.
export function isOffline(err) {
  return err instanceof TypeError || err?.name === "TypeError" || (typeof navigator !== "undefined" && navigator.onLine === false);
}

/**
 * Send queued batches in order with `send(batch)`. Stops at the first
 * connection failure (and keeps the rest); drops a batch the server refuses,
 * so one bad entry can't block the queue forever. Returns counts.
 */
export async function flush(send, storage = globalThis.localStorage) {
  let list = read(storage);
  let sent = 0;
  const refused = [];
  while (list.length) {
    const [item, ...rest] = list;
    try {
      await send(item.batch);
      sent += 1;
    } catch (err) {
      if (isOffline(err)) break;
      refused.push({ batch: item.batch, error: err?.message || String(err) });
    }
    list = rest;
    write(storage, list);
  }
  return { sent, refused, left: list.length };
}
