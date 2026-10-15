// Feature flags for the rooms that aren't finished (Wardrobe, Atlas and Salon
// now; Nose later). A room is hidden unless its flag is on:
//   - at build time: VITE_FLAG_<NAME>=1 (a preview or production build),
//   - or on one device: localStorage "kyphira.flag.<name>" = "1", set by
//     opening any page with ?flag=<name> (and cleared with ?unflag=<name>),
//     so the owner can try a room on a deployed preview without a rebuild.
// A flag only decides what is *shown*. Every room's data is private behind
// row-level security whatever the flag says, so turning one on in the
// browser exposes nothing. Pure: env and storage are passed in for tests.
export const FLAGS = ["wardrobe", "atlas", "salon"];

const key = (name) => `kyphira.flag.${name}`;

function deviceStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/** Whether a room is switched on. Unknown names are always off. */
export function flagOn(name, { env = import.meta.env, storage = deviceStorage() } = {}) {
  if (!FLAGS.includes(name)) return false;
  if (env?.[`VITE_FLAG_${name.toUpperCase()}`] === "1") return true;
  try { return storage?.getItem(key(name)) === "1"; } catch { return false; }
}

/** Applies ?flag=<name> / ?unflag=<name> from a URL's query to this device. Returns the names changed. */
export function applyFlagLink(search, storage = deviceStorage()) {
  const params = new URLSearchParams(search);
  const changed = [];
  for (const [param, value] of [["flag", "1"], ["unflag", null]]) {
    for (const name of params.getAll(param)) {
      if (!FLAGS.includes(name)) continue;
      try {
        if (value) storage?.setItem(key(name), value); else storage?.removeItem(key(name));
        changed.push(name);
      } catch { /* private mode: the flag just doesn't stick */ }
    }
  }
  return changed;
}
