import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SaveState, { SAVE_STATES } from "./SaveState.jsx";
import Confirm from "./Confirm.jsx";

const html = (props, text) => renderToStaticMarkup(React.createElement(SaveState, props, text));

describe("SaveState: one way to say what happened to a save", () => {
  it("has four states", () => {
    expect([...SAVE_STATES]).toEqual(["working", "saved", "queued", "failed"]);
  });
  it("keeps an empty status region in the page until there is something to say", () => {
    expect(html({}, null)).toBe('<p role="status" class="text-sm "></p>');
    expect(html({ state: "saved" }, "")).not.toContain("data-save-state");
    expect(html({ state: "nonsense" }, "Saved.")).not.toContain("Saved.");
  });
  it("draws a check for saved, a dashed one for saved on this phone, none for working or failed", () => {
    const saved = html({ state: "saved" }, "Saved.");
    expect(saved).toContain('data-save-state="saved"');
    expect(saved).toContain("kx-tick");
    expect(saved).not.toContain("data-queued");
    expect(html({ state: "queued" }, "Saved on this phone.")).toContain("data-queued");
    expect(html({ state: "working" }, "Saving")).not.toContain("kx-tick");
    expect(html({ state: "failed" }, "Could not save.")).not.toContain("kx-tick");
  });
  it("settles every state in the same way; only working pulses, and only with motion allowed", () => {
    for (const state of SAVE_STATES) expect(html({ state }, "x")).toContain("kx-settle");
    expect(html({ state: "working" }, "x")).toContain("motion-safe:animate-pulse");
    expect(html({ state: "saved" }, "x")).not.toContain("animate-pulse");
  });
  it("Confirm is the saved state", () => {
    expect(renderToStaticMarkup(React.createElement(Confirm, { className: "mt-2" }, "Done."))).toBe(html({ state: "saved", className: "mt-2" }, "Done."));
  });
});
