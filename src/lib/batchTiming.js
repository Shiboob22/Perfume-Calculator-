// When a batch was made and when it is ready to wear. Shared by the Batches
// list and the exported PNG card so both show the same times.
import { TIERS } from "./tiers";

const DAY_MS = 24 * 60 * 60 * 1000;

// Local YYYY-MM-DD for a Date, to compare against the date-only blend_date.
function localDay(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// Moment maceration started. created_at is the exact save time, but the
// blend date can be back-dated on the bench sheet; when it differs, trust the
// blend date (at the start of that day) since that is when the oil went in.
export function batchStartedAt(batch) {
  const created = batch.created_at ? new Date(batch.created_at) : null;
  if (created && !isNaN(created) && (!batch.blend_date || localDay(created) === batch.blend_date)) {
    return created;
  }
  if (batch.blend_date) {
    const [y, m, d] = batch.blend_date.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return created && !isNaN(created) ? created : null;
}

// Best moment to start using the batch: the end of the family's rest range,
// when the blend has fully rounded out rather than merely become wearable.
export function batchReadyAt(batch) {
  const start = batchStartedAt(batch);
  const rest = TIERS[batch.tier]?.restDays;
  if (!start || !rest) return null;
  return new Date(start.getTime() + rest[1] * DAY_MS);
}

export function formatExact(date) {
  if (!date) return "";
  return date.toLocaleString(undefined, {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

// "ready now" or "in 12 days" / "in 5 hours" relative to `now`.
export function readyCountdown(readyAt, now = new Date()) {
  if (!readyAt) return "";
  const ms = readyAt.getTime() - now.getTime();
  if (ms <= 0) return "ready now";
  const days = Math.ceil(ms / DAY_MS);
  if (days > 1) return `in ${days} days`;
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  return `in ${hours} hour${hours === 1 ? "" : "s"}`;
}
