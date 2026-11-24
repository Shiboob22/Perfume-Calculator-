import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";
import { json } from "./helpers.js";

// The QR buyer page (/o/<code>, 0040): no sign-in, against the production
// build with a fake API. Phone and desktop widths run through the two projects.
test.use({ serviceWorkers: "block" });

const CODE = "0123456789abcdef0123456789abcdef";
const BOTTLE = { shop: "Hisham Blends", scent: "Oud Nights", family: "woody", size_ml: 50, strength_pct: 25, bottled_on: "2026-11-01", feedback: null, can_edit: true };
const fill = (s, vars) => Object.entries(vars).reduce((x, [k, v]) => x.replaceAll(`{${k}}`, String(v)), s);
// Reduced motion first, as the other axe specs do: a status line caught mid-settle reads as low contrast.
const axe = async (page) => (await page.emulateMedia({ reducedMotion: "reduce" }), await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations.map((v) => v.id);

async function fakeApi(page, { bottle = BOTTLE, status = 200 } = {}) {
  const sent = [];
  await page.route("**/api/batches?**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.searchParams.get("resource") !== "buyer" || url.searchParams.get("code") !== CODE) return route.fallback();
    if (status !== 200) return json(route, { code: "not_found" }, status);
    if (req.method() === "GET") return json(route, { order: bottle });
    const body = req.postDataJSON();
    sent.push(body);
    if (body.feedback) return json(route, { order: { ...bottle, feedback: body.feedback } });
    return json(route, { requested: true }, 201);
  });
  return sent;
}

test("English: the buyer rates the bottle, then asks for it again", async ({ page }) => {
  const sent = await fakeApi(page);
  await page.goto(`/o/${CODE}`);
  const b = en.buyer;
  await expect(page.getByRole("heading", { level: 1, name: "Oud Nights" })).toBeVisible();
  await expect(page.locator("[data-buyer-shop]")).toHaveText(fill(b.from, { shop: "Hisham Blends" }));
  await expect(page.getByText(/50 mL at 25% \(\u2068?EDP Intense\u2069?\)/)).toBeVisible();
  // No site menu, the price or the original buyer: the shop, the bottle, and a quiet line at the foot.
  await expect(page.getByRole("link", { name: en.site.nav.pricing })).toHaveCount(0);
  await expect(page.getByRole("link", { name: fill(b.madeWith, { brand: "Kyphira" }) })).toBeVisible();
  expect(await page.locator('meta[name="robots"]').getAttribute("content")).toBe("noindex, nofollow");
  expect(await axe(page)).toEqual([]);

  const form = page.locator("[data-buyer-feedback]");
  await form.getByRole("button", { name: b.send }).click();
  await expect(form.getByRole("status")).toHaveText(b.empty);
  await form.getByRole("button", { name: fill(b.ratingN.other, { count: 4 }) }).click();
  await form.getByRole("button", { name: b.lasts.h4to8 }).click();
  await form.getByRole("button", { name: en.buyer.tag.sweet }).click();
  await form.getByLabel(b.note).fill("Lovely at night");
  await form.getByRole("button", { name: b.send }).click();
  await expect(form.getByRole("status")).toHaveText(fill(b.sentTo, { shop: "Hisham Blends" }));
  expect(sent[0]).toEqual({ feedback: { rating: 4, lasts: "h4to8", tags: ["sweet"], note: "Lovely at night" } });
  await expect(form.getByRole("button", { name: b.update })).toBeVisible();

  const again = page.locator("[data-buyer-again]");
  await again.getByRole("button", { name: b.again.open }).click();
  await again.getByLabel(b.again.name).fill("Mona");
  await again.getByLabel(b.again.phone).fill("+20 111 222 3333");
  await again.getByRole("button", { name: b.again.send }).click();
  await expect(again.getByRole("status")).toHaveText(fill(b.again.sentTo, { shop: "Hisham Blends" }));
  expect(sent[1]).toEqual({ reorder: { name: "Mona", phone: "+20 111 222 3333" } });
  expect(await axe(page)).toEqual([]);
});

test.describe("a phone set to Arabic", () => {
  test.use({ locale: "ar-EG" });
  test("opens the Arabic page, and the switch keeps English once chosen", async ({ page }) => {
    await fakeApi(page);
    await page.goto(`/o/${CODE}`);
    await expect(page).toHaveURL(new RegExp(`/ar/o/${CODE}$`));
    await expect(page.locator("[dir=rtl]").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: ar.buyer.ask.title })).toBeVisible();
    await expect(page.locator("[data-buyer-shop]")).toHaveText(fill(ar.buyer.from, { shop: "Hisham Blends" }));
    // A Latin scent name in the Arabic heading uses the site's serif, not a system face.
    await expect(page.locator("[data-buyer-scent]")).toHaveCSS("font-family", /^"Reem Kufi Variable", "Instrument Serif"/);
    expect(await axe(page)).toEqual([]);
    await page.locator("[data-buyer-lang]").click();
    await expect(page).toHaveURL(new RegExp(`/o/${CODE}$`));
    await expect(page.getByRole("heading", { name: en.buyer.ask.title })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: en.buyer.ask.title })).toBeVisible();
  });
});

test("an unknown bottle says so; an answer older than 30 days cannot change", async ({ page }) => {
  await fakeApi(page, { status: 404 });
  await page.goto(`/o/${CODE}`);
  await expect(page.locator("[data-buyer-missing]")).toHaveText(en.buyer.notFound);

  const other = await page.context().newPage();
  await fakeApi(other, { bottle: { ...BOTTLE, shop: null, feedback: { rating: 5 }, can_edit: false } });
  await other.goto(`/o/${CODE}`);
  await expect(other.getByText(en.buyer.closed)).toBeVisible();
  await expect(other.locator("[data-buyer-shop]")).toHaveCount(0);
  await expect(other.locator("[data-buyer-again]")).toBeVisible();
});
