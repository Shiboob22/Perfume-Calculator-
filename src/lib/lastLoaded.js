// What a list showed when it last loaded in this visit, kept in memory only
// (never on the device), so a failed reload can still show it (audit M5).
// Signing out forgets everything.
const memory = new Map();

export const remember = (key, value) => { memory.set(key, value); };
export const recall = (key) => memory.get(key) ?? null;
export const forgetAll = () => { memory.clear(); };

// Why a load failed, in the words the page uses: "offline" when the phone
// says it has no connection, else "failed".
export const loadFailure = () => (typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "failed");
