import { test, expect } from "@playwright/test";
import en from "../src/i18n/messages/en.js";
import { FEATURES } from "../src/lib/entitlements.js";
import { USER, json, signIn } from "./helpers.js";

// The flammability line where alcohol is weighed or blending is talked
// through, not on every page (audit M9, owner's go-ahead 2026-11-22). The
// wording is the owner's and unchanged.
test.use({ serviceWorkers: "block" });

const footerLine = (page) => page.locator("footer").getByText(en.site.footer.safety);

test("public site: the home page keeps it; Pricing drops it; a blending guide shows its own notice once", async ({ page }) => {
  await page.goto("/");
  await expect(footerLine(page)).toBeVisible();
  await page.goto("/pricing");
  await expect(footerLine(page)).toHaveCount(0);
  await page.goto("/library/the-calculation");
  await expect(footerLine(page)).toHaveCount(0);
  await expect(page.getByText(en.site.safety.text)).toHaveCount(1);
});

test("app: Ask keeps it; Account and Inventory drop it; the Bench has its own", async ({ page }) => {
  await signIn(page);
  await page.route(/\/(auth|rest)\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) return json(route, USER);
    if (url.includes("/rest/v1/profiles")) return json(route, [{ locale: "en", default_unit: "ml", default_bottle: 50, digits: "latn", onboarded_at: "2026-10-01T00:00:00Z", bench_tour_at: "2026-10-01T00:00:00Z" }]);
    return json(route, []);
  });
  await page.route("**/api/**", (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p === "/api/me") return json(route, { plan: "pro", name: "Pro", features: FEATURES, batchCap: null, batchesUsed: 0 });
    if (p === "/api/batches") return json(route, { batches: [] });
    return json(route, {});
  });
  for (const [path, shown] of [["/app/ask", true], ["/app/account", false], ["/app/inventory", false], ["/bench", false]]) {
    await page.goto(path);
    await expect(page.locator("footer")).toBeAttached();
    await expect(footerLine(page), path).toHaveCount(shown ? 1 : 0);
  }
});
