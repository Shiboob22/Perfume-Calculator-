import { test, expect } from "@playwright/test";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";

// Motion M5, the public site: Pricing, the guides index and the shop speak the
// app's language (M1 answer, M3 hold), not only the reveals they had. Against
// the production build, no sign-in.
test.use({ serviceWorkers: "block" });

const motion = (page) => page.addInitScript(() => localStorage.setItem("kyphira.flag.motion", "1"));
const tabs = (page, m = en) => page.getByRole("group", { name: m.site.guides.tabs.label });
const rule = (page) => page.locator('[data-mo-ind="guides"]');
const shift = (page) => rule(page).evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);

test("guides: one rule under the open tab slides to the other, and the panel settles in only after a switch", async ({ page }) => {
  await motion(page);
  await page.goto("/library");
  await expect(rule(page)).toHaveCount(1);
  expect(await shift(page)).toBe(0);
  // The page opening is not a switch: nothing settles.
  await expect(page.locator(".kx-settle")).toHaveCount(0);
  const glossary = tabs(page).getByRole("button", { name: en.site.guides.tabs.glossary });
  await glossary.click();
  await expect(glossary).toHaveAttribute("aria-pressed", "true");
  const w = await tabs(page).getByRole("button").first().evaluate((el) => el.getBoundingClientRect().width);
  await expect.poll(() => shift(page)).toBeCloseTo(w, 0); // one tab's width toward the end edge
  const transition = await rule(page).evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(transition).toContain("0.25s");
  await expect(page.getByRole("heading", { name: en.site.guides.tabs.glossary })).toBeAttached();
  expect(await page.locator(".kx-settle").count()).toBeGreaterThan(0);
});

test("guides in Arabic: the rule slides toward the left", async ({ page }) => {
  await motion(page);
  await page.goto("/ar/library");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await tabs(page, ar).getByRole("button", { name: ar.site.guides.tabs.glossary }).click();
  await expect.poll(() => shift(page)).toBeLessThan(-10);
});

// The guides a search drops leave a gap; the ones it keeps slide up into it.
// "clothing" keeps 7 of the 12 Wearing parts, not the first two.
const search = (page) => page.getByRole("searchbox", { name: en.site.guides.search });
const record = (page) => page.evaluate(() => {
  window.__slid = 0;
  const tick = () => { window.__slid = Math.max(window.__slid, document.getAnimations().filter((a) => a.effect?.target?.hasAttribute?.("data-flip")).length); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});

test("guides: a search that keeps some parts slides them to their new places", async ({ page }) => {
  await motion(page);
  // Only rows on screen move: a screen tall enough to hold the Wearing parts under the search field.
  await page.setViewportSize({ width: page.viewportSize().width, height: 3200 });
  await page.goto("/library");
  await expect(page.locator("[data-flip]").first()).toBeVisible();
  await record(page);
  await search(page).fill("clothing");
  await expect(page.locator('[data-flip="where-to-spray"]')).toBeVisible();
  await expect(page.locator('[data-flip="skin-preparation"]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__slid)).toBeGreaterThan(0);
});

test("reduced motion: the guides rule jumps and nothing slides", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await motion(page);
  await page.goto("/library");
  expect(await rule(page).evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
  await record(page);
  await search(page).fill("clothing");
  await expect(page.locator('[data-flip="skin-preparation"]')).toHaveCount(0);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__slid)).toBe(0);
});

test("pricing: the plan links answer a press", async ({ page }) => {
  await motion(page);
  await page.goto("/pricing");
  const links = page.locator("a.mo-press");
  await expect(links).toHaveCount(2);
  const link = links.first();
  await link.scrollIntoViewIfNeeded();
  const box = await link.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect.poll(() => link.evaluate((el) => getComputedStyle(el).scale)).toBe("0.985");
  await page.mouse.up();
});

test("shop: loading keeps the shape of the products, and the cart count settles when it changes", async ({ page }) => {
  await motion(page);
  await page.addInitScript(() => localStorage.setItem("kyphira.flag.shop", "1"));
  const product = { id: "p2", slug: "kit", name: { en: "Blending kit", ar: "طقم الخلط" }, description: { en: "Beaker.", ar: "كوب." }, image: null, price: 650, variants: [] };
  await page.route("**/api/shop", async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ products: [product] }) });
  });
  await page.goto("/shop");
  const skeleton = page.locator("[data-skeleton]");
  await expect(skeleton).toBeVisible();
  await expect(skeleton).toHaveAttribute("role", "status");
  await expect(skeleton).toContainText(en.shop.loading);
  const add = page.getByRole("article").getByRole("button", { name: /Add to cart/ });
  await expect(skeleton).toHaveCount(0);
  await add.click();
  await expect(page.getByRole("article").getByRole("button").locator(".kx-settle")).toHaveText(en.shop.added);
  await page.getByRole("article").getByRole("button").click();
  const vp = page.viewportSize();
  if (vp.width < 1024) {
    // The phone bar's count is keyed by the count: a new element that settles in.
    await expect(page.locator('[data-cart-count="2"]')).toHaveClass(/kx-settle/);
  }
});
