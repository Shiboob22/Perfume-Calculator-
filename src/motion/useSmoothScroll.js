import { useEffect } from "react";
import { roomSmoothAllowed, startSmoothScroll } from "./smooth.js";

/**
 * Smooth wheel scrolling while this component is mounted. With no argument
 * (the home page) it always runs; with `{ pathname }` only in the reading
 * rooms on wide screens, and again when the path changes.
 */
export function useSmoothScroll({ pathname } = {}) {
  useEffect(() => {
    if (pathname !== undefined && !roomSmoothAllowed(pathname)) return undefined;
    return startSmoothScroll();
  }, [pathname]);
}
