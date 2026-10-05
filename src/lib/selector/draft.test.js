import { describe, expect, it } from "vitest";
import { LAST_STEP, parseDraft, serializeDraft } from "./draft";
import { profileFromRow } from "./index";

const known = [{ status: "loved", profile: profileFromRow({ id: "1", name: "Layton", brand: "PdM", accords: ["Woody"], extra: "dropped" }) }];

describe("selector draft", () => {
  it("round-trips answers, step and known fragrances", () => {
    const text = serializeDraft({ step: 4, answers: { families: ["woody"], sweetness: 3 }, known });
    expect(text).not.toContain("dropped");
    const d = parseDraft(text);
    expect(d.step).toBe(4);
    expect(d.answers).toEqual({ families: ["woody"], sweetness: 3 });
    expect(d.known[0].status).toBe("loved");
    expect(d.known[0].profile.name).toBe("Layton");
  });
  it("rejects absent or malformed drafts", () => {
    for (const bad of [null, "", "{", "[]", "null", '{"v":2}', '{"v":1,"answers":[]}', '{"v":1}']) expect(parseDraft(bad)).toBeNull();
  });
  it("clamps the step and drops unusable known entries", () => {
    expect(parseDraft('{"v":1,"step":99,"answers":{}}').step).toBe(LAST_STEP);
    expect(parseDraft('{"v":1,"step":-3,"answers":{}}').step).toBe(0);
    expect(parseDraft('{"v":1,"step":"x","answers":{}}').step).toBe(0);
    const d = parseDraft('{"v":1,"answers":{},"known":[{"status":"nope","row":{"name":"A"}},{"status":"loved","row":{}},{"status":"loved","row":{"name":"B","id":"b"}}]}');
    expect(d.known.map((k) => k.profile.name)).toEqual(["B"]);
  });
});
