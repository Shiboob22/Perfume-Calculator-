import React from "react";
import { COLORS } from "../../lib/theme";

// The ruled beam across the top of a room (v7): twelve ticks and a brass pan
// one sixth wide, sitting under the room's place in the order of the six.
// `at` is 0 to 5; omit it for pages that are not a room (account, sign-in).
// Static and decorative: it marks place, it does not move.
export default function RoomBeam({ at, className = "mb-8" }) {
  return (
    <div aria-hidden="true" className={`kx-beam relative h-3 border-t-2 ${className}`} style={{ borderColor: COLORS.ink }}>
      {at != null && <span className="kx-pan absolute top-0 h-[5px] w-1/6" style={{ insetInlineStart: `${(at / 6) * 100}%`, background: COLORS.amber }} />}
    </div>
  );
}
