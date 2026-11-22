import { useEffect, useState } from "react";

// True while the window is at least `px` wide (a CSS min-width media query),
// following resizes and rotation. False before matchMedia exists (tests, SSR).
export function useMinWidth(px) {
  const query = `(min-width: ${px}px)`;
  const [on, setOn] = useState(() => typeof window !== "undefined" && Boolean(window.matchMedia?.(query).matches));
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const update = () => setOn(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return on;
}
