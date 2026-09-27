// "Export my data": everything a user owns, as one JSON file or one CSV per
// table. Pure functions; the account page fetches the rows and saves the file.

// The tables a user owns, in the order the export lists them. user_id is
// dropped from every row: it is the same on all of them and means nothing
// outside this database.
export const EXPORT_TABLES = ["batches", "inventory", "fragrance_notes", "calc_presets", "profiles"];

function strip(rows) {
  return (rows || []).map(({ user_id: _omit, ...rest }) => rest);
}

export function toJson(data, exportedAt = new Date()) {
  const out = { exported_at: exportedAt.toISOString(), app: "The Scent Handbook" };
  for (const table of EXPORT_TABLES) out[table] = strip(data[table]);
  return JSON.stringify(out, null, 2);
}

// A spreadsheet runs a cell that starts with = + - @ (or a tab/CR) as a
// formula. Notes are free text, so such cells get a leading apostrophe.
// Numbers are left alone: -3 is a value, not a formula.
function cell(value) {
  if (value == null) return "";
  let s = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// One table as CSV. Columns are the union of every row's keys, first-seen
// order, so a column missing from early rows still appears.
export function toCsv(rows) {
  const clean = strip(rows);
  const columns = [];
  for (const row of clean) for (const key of Object.keys(row)) if (!columns.includes(key)) columns.push(key);
  if (columns.length === 0) return "";
  const lines = [columns.join(","), ...clean.map((row) => columns.map((c) => cell(row[c])).join(","))];
  // CRLF per RFC 4180; the BOM makes Excel read UTF-8 (Arabic names) correctly.
  return "﻿" + lines.join("\r\n") + "\r\n";
}
