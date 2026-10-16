import { useEffect, useState } from "react";
import { flagOn } from "./flags";

const NAMES = ["wardrobe", "atlas", "salon", "nose"];
const read = (storage) => Object.fromEntries(NAMES.map((n) => [n, flagOn(n, storage === null ? { storage: null } : undefined)]));

/**
 * Which rooms are open: { wardrobe, atlas, salon, nose }. The first render
 * (and the prerender) reads the build flags only, so server and browser HTML
 * agree; a device flag (?flag=atlas) is applied after hydration.
 */
export function useRoomFlags() {
  const [flags, setFlags] = useState(() => read(null));
  useEffect(() => {
    const next = read();
    if (NAMES.some((n) => next[n] !== flags[n])) setFlags(next);
  }, [flags]);
  return flags;
}
