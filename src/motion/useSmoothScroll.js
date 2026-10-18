import { useEffect } from "react";
import { startSmoothScroll } from "./smooth.js";

/** Smooth wheel scrolling while this component is mounted. Call it from the home page only. */
export function useSmoothScroll() {
  useEffect(() => startSmoothScroll(), []);
}
