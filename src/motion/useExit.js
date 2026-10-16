import { useCallback, useEffect, useRef, useState } from "react";
import { TOKENS } from "./config.js";
import { motionOn, reduced } from "./env.js";

/**
 * Lets a thing play its exit before it goes. `leave(done)` marks it leaving
 * (data-leaving) and calls `done` after the base duration, or at once when
 * motion is off or reduced. Nothing moves in layout while it leaves: the exit
 * is opacity and transform only.
 */
export function useExit(ms = TOKENS.duration.base) {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const leave = useCallback((done) => {
    if (!motionOn() || reduced()) { done(); return; }
    setLeaving(true);
    timer.current = setTimeout(done, ms);
  }, [ms]);
  return { leaving, leave };
}
