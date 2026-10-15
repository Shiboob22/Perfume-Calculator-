import { describe, it, expect } from "vitest";
import { parseSalonPath, profileHref } from "./paths.js";
import { authorName, benchHref, cleanHandle, hasLink, postRow, profileRow, recipeLine, snapshotFromRecipe, snapshotFromVersion } from "./validate.js";

describe("salon paths", () => {
  it("reads each view", () => {
    expect(parseSalonPath("/salon")).toEqual({ view: "feed" });
    expect(parseSalonPath("/salon/")).toEqual({ view: "feed" });
    expect(parseSalonPath("/salon/new")).toEqual({ view: "new" });
    expect(parseSalonPath("/salon/me")).toEqual({ view: "me" });
    expect(parseSalonPath("/salon/moderation")).toEqual({ view: "moderation" });
    expect(parseSalonPath("/salon/u/Ada_Perfumes")).toEqual({ view: "profile", handle: "ada_perfumes" });
  });
  it("falls back to the feed for anything odd", () => {
    expect(parseSalonPath("/salon/u/x")).toEqual({ view: "feed" });
    expect(parseSalonPath("/salon/u/bad handle")).toEqual({ view: "feed" });
    expect(parseSalonPath("/salon/u/%E0%A4%A")).toEqual({ view: "feed" });
    expect(parseSalonPath("/salon/nope")).toEqual({ view: "feed" });
  });
  it("builds a profile link", () => expect(profileHref("Ada_P")).toBe("/salon/u/ada_p"));
});

describe("links are refused", () => {
  it.each(["https://x.test", "http://x", "see www.example", "me@example.com", "visit example.com", "shop at foo.shop now", "best.store"])("%s", (s) => {
    expect(hasLink(s)).toBe(true);
  });
  it.each(["A woody blend with oud and amber.", "25% at 100 mL", "Dior Sauvage, lovely", "ratio 3.5 to 1", ""])("%s is fine", (s) => {
    expect(hasLink(s)).toBe(false);
  });
});

describe("profileRow", () => {
  it("normalises the handle and blanks to null", () => {
    expect(profileRow({ handle: " @Ada_P ", displayName: " ", bio: "", isPublic: 1 })).toEqual({ value: { handle: "ada_p", display_name: null, bio: null, is_public: true } });
  });
  it("lists every bad field", () => {
    expect(profileRow({ handle: "a", displayName: "x".repeat(61), bio: "see www.x", isPublic: false }).errors).toEqual(["handle", "displayName", "bio"]);
  });
  it("cleanHandle copes with nothing", () => expect(cleanHandle(null)).toBe(""));
});

describe("snapshots carry only the blend", () => {
  const version = { amount: "100", unit: "ml", concentration_pct: "25", oil_density: "0.95", ethanol_density: null, note: "private note", id: "v", user_id: "u" };
  it("drops notes and ids, keeps set densities", () => {
    expect(snapshotFromVersion(version)).toEqual({ amount: 100, unit: "ml", concentration_pct: 25, oil_density: 0.95 });
  });
  it("takes the latest version of a recipe", () => {
    const recipe = { recipe_versions: [{ ...version, version: 1 }, { ...version, version: 2, amount: 50 }] };
    expect(snapshotFromRecipe(recipe).amount).toBe(50);
    expect(snapshotFromRecipe({ recipe_versions: [] })).toBeNull();
    expect(snapshotFromVersion(null)).toBeNull();
  });
  it("describes a blend", () => expect(recipeLine({ amount: 100, unit: "ml", concentration_pct: 25 })).toBe("100 mL · 25%"));
});

describe("postRow", () => {
  const snapshot = { amount: 100, unit: "ml", concentration_pct: 25 };
  it("builds a recipe post", () => {
    expect(postRow({ kind: "recipe", title: " Oud Nights ", body: "", family: "woody", snapshot }).value).toEqual({ kind: "recipe", title: "Oud Nights", body: null, snapshot, family: "woody" });
  });
  it("builds a review", () => {
    expect(postRow({ kind: "review", title: "Clean", body: "Lasts.", fragranceId: "f", rating: "4" }).value).toEqual({ kind: "review", title: "Clean", body: "Lasts.", fragrance_id: "f", rating: 4 });
  });
  it("names what is wrong", () => {
    expect(postRow({ kind: "recipe", title: "", body: "x".repeat(1501) }).errors).toEqual(["title", "body", "recipe"]);
    expect(postRow({ kind: "review", title: "t", fragranceId: "", rating: 6 }).errors).toEqual(["fragrance", "rating"]);
    expect(postRow({ kind: "review", title: "t", fragranceId: "f", rating: 2.5 }).errors).toEqual(["rating"]);
    expect(postRow({ kind: "essay", title: "t" }).errors).toContain("kind");
    expect(postRow({ kind: "recipe", title: "buy at shop.com", snapshot }).errors).toEqual(["title"]);
  });
});

describe("post helpers", () => {
  it("opens a blend on the Bench", () => {
    const href = benchHref({ title: "Oud Nights", family: "woody", snapshot: { amount: 100, unit: "ml", concentration_pct: 25 } });
    expect(href).toBe("/bench?size=100&unit=ml&conc=25&family=woody&name=Oud+Nights");
  });
  it("names an author", () => {
    expect(authorName({ display_name: "Ada", handle: "ada" })).toBe("Ada");
    expect(authorName({ display_name: null, handle: "ada" })).toBe("@ada");
  });
});
