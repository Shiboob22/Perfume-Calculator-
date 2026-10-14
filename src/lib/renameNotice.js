// Whether to show "<former name> is now <name>": from the rebrand's first
// day for `renameNoticeDays` days, and not once dismissed. Pure; `now` is a Date.
const DAY = 86400000;

export function renameNoticeVisible(now, dismissed, { renameNoticeFrom, renameNoticeDays }) {
  if (dismissed) return false;
  const start = Date.parse(`${renameNoticeFrom}T00:00:00Z`);
  const elapsed = now.getTime() - start;
  return elapsed >= 0 && elapsed < renameNoticeDays * DAY;
}
