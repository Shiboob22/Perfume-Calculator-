/** The user's own calendar day as YYYY-MM-DD (not UTC: a late-night wearing belongs to that evening's date). */
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
