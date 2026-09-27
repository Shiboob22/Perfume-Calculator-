import { describe, expect, it } from "vitest";
import { EXPORT_TABLES, toCsv, toJson } from "./exportData";

describe("toJson", () => {
  it("lists every owned table and drops user_id", () => {
    const out = JSON.parse(toJson({ batches: [{ id: "b1", user_id: "u", oil_g: 20 }] }, new Date("2026-09-27T00:00:00Z")));
    expect(out.exported_at).toBe("2026-09-27T00:00:00.000Z");
    expect(Object.keys(out)).toEqual(["exported_at", "app", ...EXPORT_TABLES]);
    expect(out.batches).toEqual([{ id: "b1", oil_g: 20 }]);
    expect(out.inventory).toEqual([]);
  });
});

describe("toCsv", () => {
  it("is empty for no rows", () => {
    expect(toCsv([])).toBe("");
    expect(toCsv(undefined)).toBe("");
  });

  it("writes a BOM, a header from every row's keys, and CRLF lines", () => {
    const csv = toCsv([{ id: 1, user_id: "u" }, { id: 2, notes: "ok" }]);
    expect(csv).toBe("﻿id,notes\r\n1,\r\n2,ok\r\n");
  });

  it("quotes commas, quotes and newlines", () => {
    expect(toCsv([{ n: 'a,"b"\nc' }])).toBe('﻿n\r\n"a,""b""\nc"\r\n');
  });

  it("defuses text that a spreadsheet would run as a formula", () => {
    const csv = toCsv([{ a: "=HYPERLINK(1)", b: "+1", c: "@x", d: -3, e: "-", f: "عود" }]);
    expect(csv.split("\r\n")[1]).toBe("'=HYPERLINK(1),'+1,'@x,-3,'-,عود");
  });

  it("writes objects as JSON and null as empty", () => {
    expect(toCsv([{ o: { k: 1 }, z: null }]).split("\r\n")[1]).toBe('"{""k"":1}",');
  });
});
