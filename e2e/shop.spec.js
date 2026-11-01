import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";

// The public Shop, against the production build with a fake /api/shop: no
// sign-in, a cart kept on the device, and an order placed with an InstaPay
// screenshot. What the page sends is checked; the server's own rules are
// covered by the API tests.
test.use({ serviceWorkers: "block" });

const loc = (en, ar) => ({ en, ar });
const PRODUCTS = [
  { id: "p1", slug: "decant", name: loc("Sample decant", "عينة صغيرة"), description: loc("A small decant.", "عينة صغيرة."), image: null, price: 150,
    variants: [{ id: "5ml", label: loc("5 mL", "٥ مل"), price: 150 }, { id: "10ml", label: loc("10 mL", "١٠ مل"), price: 260 }] },
  { id: "p2", slug: "kit", name: loc("Blending kit", "طقم الخلط"), description: loc("Beaker and labels.", "كوب وملصقات."), image: null, price: 650, variants: [] },
];
// A real 1×1 PNG.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

async function fakeShop(page, { orderStatus = 201, orderBody = { orderNo: "K-ABC234", total: 1170 } } = {}) {
  const sent = { orders: [] };
  await page.addInitScript(() => localStorage.setItem("kyphira.flag.shop", "1"));
  await page.route("**/api/shop", async (route) => {
    const req = route.request();
    if (req.method() === "GET") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ products: PRODUCTS }) });
    sent.orders.push(req.postDataJSON());
    return route.fulfill({ status: orderStatus, contentType: "application/json", body: JSON.stringify(orderBody) });
  });
  return sent;
}

const fill = async (page) => {
  await page.getByLabel(en.shop.checkout.name).fill("Mona Adel");
  await page.getByLabel(en.shop.checkout.phone).fill("+20 100 123 4567");
  await page.getByLabel(en.shop.checkout.email).fill("mona@example.com");
  await page.getByLabel(en.shop.checkout.city).fill("Cairo");
  await page.getByLabel(en.shop.checkout.address).fill("12 Nile St, Maadi");
};

test("with the flag off, /shop is not found and the header has no Shop link", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.site.notFound.title);
  await expect(page.getByRole("navigation", { name: en.site.nav.main }).getByRole("link", { name: en.site.nav.shop })).toHaveCount(0);
});

test("anyone can add to the cart, check out with a screenshot, and get an order number", async ({ page }) => {
  const sent = await fakeShop(page);
  await page.goto("/shop");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.shop.title);
  await expect(page.getByRole("navigation", { name: en.site.nav.main }).getByRole("link", { name: new RegExp(en.site.nav.shop) })).toBeVisible();

  const decant = page.getByRole("article").filter({ hasText: "Sample decant" });
  await decant.getByLabel(en.shop.option).selectOption("10ml");
  await decant.getByRole("button", { name: /Add to cart/ }).click();
  await decant.getByRole("button", { name: /Added|Add to cart/ }).click(); // twice
  await page.getByRole("article").filter({ hasText: "Blending kit" }).getByRole("button", { name: /Add to cart/ }).click();

  const cart = page.getByRole("complementary", { name: en.shop.cart.title });
  await expect(cart).toContainText("Sample decant (10 mL)");
  await expect(cart).toContainText("EGP");
  await expect(cart.getByText(en.shop.cart.total).locator("..")).toContainText("1,170");

  // The cart is kept on this device.
  await page.reload();
  await expect(page.getByRole("complementary", { name: en.shop.cart.title })).toContainText("Blending kit");

  await page.getByRole("complementary", { name: en.shop.cart.title }).getByRole("link", { name: en.shop.cart.checkout }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.shop.checkout.title);
  await expect(page.getByRole("link", { name: en.shop.checkout.pay.open })).toHaveAttribute("href", /ipn\.eg\/S\/shibooob\/instapay/);
  await expect(page.getByText("shibooob@instapay")).toBeVisible();

  await fill(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "transfer.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByAltText(en.shop.checkout.proof.preview)).toBeVisible();
  await page.getByRole("button", { name: en.shop.checkout.submit }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.shop.thanks.title);
  await expect(page.getByText("K-ABC234")).toBeVisible();

  expect(sent.orders).toHaveLength(1);
  const body = sent.orders[0];
  expect(body.items).toEqual([{ productId: "p1", variantId: "10ml", qty: 2 }, { productId: "p2", variantId: null, qty: 1 }]);
  expect(body.customer).toMatchObject({ name: "Mona Adel", email: "mona@example.com", city: "Cairo" });
  expect(body.lang).toBe("en");
  expect(body.website).toBe("");
  expect(Buffer.from(body.proof, "base64").subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff])); // re-encoded as JPEG
  expect(JSON.stringify(body)).not.toMatch(/total|price/i); // the server prices the order

  // The cart is emptied once the order is in.
  await page.goto("/shop");
  await expect(page.getByRole("complementary", { name: en.shop.cart.title })).toContainText(en.shop.cart.empty);
});

test("checkout will not send an order without the screenshot", async ({ page }) => {
  const sent = await fakeShop(page);
  await page.goto("/shop");
  await page.getByRole("article").filter({ hasText: "Blending kit" }).getByRole("button", { name: /Add to cart/ }).click();
  await page.getByRole("complementary", { name: en.shop.cart.title }).getByRole("link", { name: en.shop.cart.checkout }).click();
  await fill(page);
  await page.getByRole("button", { name: en.shop.checkout.submit }).click();
  await expect(page.getByRole("alert").filter({ hasText: en.shop.errors.no_proof })).toBeVisible();
  expect(sent.orders).toHaveLength(0);
});

test("checkout names the fields that are wrong", async ({ page }) => {
  await fakeShop(page);
  await page.goto("/shop");
  await page.getByRole("article").filter({ hasText: "Blending kit" }).getByRole("button", { name: /Add to cart/ }).click();
  await page.getByRole("complementary", { name: en.shop.cart.title }).getByRole("link", { name: en.shop.cart.checkout }).click();
  await page.getByLabel(en.shop.checkout.email).fill("not-an-email");
  await page.getByRole("button", { name: en.shop.checkout.submit }).click();
  await expect(page.getByText(en.shop.errors.bad_name)).toBeVisible();
  await expect(page.getByText(en.shop.errors.bad_email)).toBeVisible();
});

test("a refused order keeps the cart and says why", async ({ page }) => {
  await fakeShop(page, { orderStatus: 400, orderBody: { error: "x", code: "cart_unknown_product" } });
  await page.goto("/shop");
  await page.getByRole("article").filter({ hasText: "Blending kit" }).getByRole("button", { name: /Add to cart/ }).click();
  await page.getByRole("complementary", { name: en.shop.cart.title }).getByRole("link", { name: en.shop.cart.checkout }).click();
  await fill(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "transfer.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: en.shop.checkout.submit }).click();
  await expect(page.getByRole("alert").filter({ hasText: en.shop.errors.cart_unknown_product })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.shop.checkout.title);
});

test("the Arabic shop reads right to left and orders in Arabic", async ({ page }) => {
  const sent = await fakeShop(page);
  await page.goto("/ar/shop");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(ar.shop.title);
  await page.getByRole("article").filter({ hasText: "طقم الخلط" }).getByRole("button", { name: new RegExp(ar.shop.add) }).click();
  await page.getByRole("complementary", { name: ar.shop.cart.title }).getByRole("link", { name: ar.shop.cart.checkout }).click();
  await expect(page).toHaveURL(/\/ar\/shop\/checkout$/);
  await page.getByLabel(ar.shop.checkout.name).fill("منى عادل");
  await page.getByLabel(ar.shop.checkout.phone).fill("+20 100 123 4567");
  await page.getByLabel(ar.shop.checkout.email).fill("mona@example.com");
  await page.getByLabel(ar.shop.checkout.city).fill("القاهرة");
  await page.getByLabel(ar.shop.checkout.address).fill("١٢ شارع النيل، المعادي");
  await page.locator('input[type="file"]').setInputFiles({ name: "t.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: ar.shop.checkout.submit }).click();
  await expect(page).toHaveURL(/\/ar\/shop\/thanks$/);
  expect(sent.orders[0].lang).toBe("ar");
});

for (const path of ["/shop", "/ar/shop"]) {
  test(`accessibility: ${path} and its checkout`, async ({ page }) => {
    await fakeShop(page);
    await page.goto(path);
    await page.getByRole("article").first().waitFor();
    await page.getByRole("article").nth(1).getByRole("button").first().click();
    const scan = async () => {
      await page.waitForTimeout(800);
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
    };
    await scan();
    await page.goto(`${path}/checkout`);
    await page.locator("form").waitFor();
    await scan();
  });
}
