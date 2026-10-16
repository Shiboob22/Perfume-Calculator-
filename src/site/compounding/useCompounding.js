import { useEffect, useState } from "react";
import { flagOn } from "../../lib/flags";

// Whether the home page shows the scroll scene. The first render (and the
// prerender) reads the build flag only, so the HTML never differs between
// server and browser; a device flag (?flag=compounding) switches it on after
// hydration.
export function useCompounding() {
  const [on, setOn] = useState(() => flagOn("compounding", { storage: null }));
  useEffect(() => { if (!on && flagOn("compounding")) setOn(true); }, [on]);
  return on;
}
