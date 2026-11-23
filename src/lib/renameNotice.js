// Whether to show "<former name> is now <name>": from the rebrand's first
// day for `renameNoticeDays` days, not once dismissed, and not to an account made
// after the rename (it never knew the old name). Pure; `now` is a Date, `createdAt`
// the account's ISO creation time (unknown: shown).
const DAY = 86400000;

export function renameNoticeVisible(now, dismissed, { renameNoticeFrom, renameNoticeDays }, createdAt) {
  if (dismissed) return false;
  const start = Date.parse(`${renameNoticeFrom}T00:00:00Z`);
  if (Date.parse(createdAt) >= start) return false;
  const elapsed = now.getTime() - start;
  return elapsed >= 0 && elapsed < renameNoticeDays * DAY;
}
