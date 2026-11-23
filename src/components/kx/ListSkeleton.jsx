import React from "react";
import { Skeleton } from "../../motion";
import { COLORS } from "../../lib/theme";

// Motion M3, hold: a list that is loading keeps the shape of what is coming,
// one ruled row per expected item (a mark, a name, a line of facts, and the
// rest bar for batches), so the page does not jump when the rows arrive. The
// lines sweep slowly with the motion layer on and stay still under reduced
// motion; screen readers hear the words only.
export default function ListSkeleton({ label, rows = 4, bar = false, framed = false, className = "" }) {
  const n = Math.max(1, Math.min(8, rows));
  return (
    <div role="status" data-skeleton className={className}>
      <span className="sr-only">{label}</span>
      <ul aria-hidden="true" className={`list-none p-0 m-0 ${framed ? "grid gap-3" : ""}`} style={framed ? undefined : { borderTop: `1px solid ${COLORS.line}` }}>
        {Array.from({ length: n }, (_, i) => (
          <li key={i} className={`flex items-center gap-3 ${framed ? "p-4 border rounded" : "px-2 py-3"}`}
            style={framed ? { borderColor: COLORS.line, background: COLORS.card } : { borderBottom: `1px solid ${COLORS.line}` }}>
            <Skeleton w={10} h={10} className="rounded-full flex-none" />
            <span className="flex-1 min-w-0 grid gap-2">
              <Skeleton w={`${62 - (i % 3) * 9}%`} h={16} />
              <Skeleton w={`${44 - (i % 2) * 8}%`} h={12} />
              {bar && <Skeleton w="100%" h={6} />}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
