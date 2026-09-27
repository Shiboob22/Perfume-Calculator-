import { describe as group, it, expect } from "vitest";
import { describe, splitName } from "./fragranceStyle";
import { createTranslator } from "../i18n/core";
import en from "../i18n/messages/en";
import ar from "../i18n/messages/ar";

const catalogs = { en, ar };

// The English paragraph before it became translatable, kept as the reference.
function oldDescribe(p) {
  const listText = (items) => {
    const xs = (items || []).filter(Boolean);
    if (xs.length <= 1) return xs.join("");
    return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
  };
  const GENDER = { women: "for women", men: "for men", unisex: "for women and men" };
  const { brand, title } = splitName(p);
  const parts = [];
  const fam = p?.olfactory_family;
  const gender = GENDER[p?.gender];
  const article = fam && /^[aeiou]/i.test(fam) ? "an" : "a";
  if (brand && (fam || gender)) parts.push(`${title} by ${brand} is ${fam ? `${article} ${fam} ` : "a "}fragrance${gender ? ` ${gender}` : ""}.`);
  if (p?.year) parts.push(`${title} was launched in ${p.year}.`);
  const noses = p?.perfumers || [];
  if (noses.length === 1) parts.push(`The nose behind this fragrance is ${noses[0]}.`);
  if (noses.length > 1) parts.push(`The noses behind this fragrance are ${listText(noses)}.`);
  const levels = [["Top notes", p?.top_notes], ["middle notes", p?.middle_notes], ["base notes", p?.base_notes]].filter(([, xs]) => xs && xs.length);
  if (levels.length === 3) parts.push(levels.map(([l, xs]) => `${l} ${xs.length > 1 ? "are" : "is"} ${listText(xs)}`).join("; ") + ".");
  else if (levels.length > 0) parts.push(`Notes include ${listText(levels.flatMap(([, xs]) => xs).slice(0, 12))}.`);
  return parts.join(" ");
}

const fixtures = [
  { name: "Dior Sauvage", brand: "Dior", olfactory_family: "Aromatic Fougere", gender: "men", year: 2015, perfumers: ["François Demachy"],
    top_notes: ["Calabrian bergamot", "Pepper"], middle_notes: ["Sichuan Pepper", "Lavender", "Pink Pepper"], base_notes: ["Ambroxan"] },
  { name: "Maison Francis Kurkdjian Baccarat Rouge 540", brand: "Maison Francis Kurkdjian", olfactory_family: "Amber Floral", gender: "unisex",
    perfumers: ["Francis Kurkdjian", "Someone Else", "A Third"], top_notes: ["Saffron", "Jasmine"] },
  { name: "Plain Name", brand: null, year: 2001 },
  { name: "Creed Aventus", brand: "Creed", gender: "men" },
];

group("describe()", () => {
  it("writes exactly the old English paragraph", () => {
    const t = createTranslator("en", catalogs);
    for (const p of fixtures) expect(describe(p, t, "en")).toBe(oldDescribe(p));
  });

  it("writes Arabic with Arabic list joining and no stray placeholders", () => {
    const text = describe(fixtures[1], createTranslator("ar", catalogs), "ar");
    expect(text).toContain(new Intl.ListFormat("ar", { type: "conjunction" }).format(["Francis Kurkdjian", "Someone Else", "A Third"]));
    expect(text).not.toMatch(/\{\w+\}/);
    expect(text).toContain("للنساء والرجال");
  });
});
