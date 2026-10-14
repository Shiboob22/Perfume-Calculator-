// Retired addresses answer 301 and land on the new room, keeping the query.
import { test, expect } from "@playwright/test";

const MOVES = [
  ["/app/calculator?size=100&unit=ml&conc=25", "/bench?size=100&unit=ml&conc=25"],
  ["/app/batches", "/bench/journal"],
  ["/guides", "/library"],
  ["/guides/the-calculation", "/library/the-calculation"],
  ["/ar/guides", "/ar/library"],
  ["/ar/guides/at-the-bench", "/ar/library/at-the-bench"],
];

for (const [from, to] of MOVES) {
  test(`301: ${from} → ${to}`, async ({ request }) => {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(res.headers().location).toBe(to);
  });
}

test("the old guide address ends on the new page", async ({ page }) => {
  await page.goto("/guides/the-calculation");
  await expect(page).toHaveURL(/\/library\/the-calculation$/);
  await expect(page.locator("h1")).toBeVisible();
});

test("/bench opens the app shell, not a 404", async ({ request }) => {
  for (const path of ["/bench", "/bench/journal"]) {
    const res = await request.get(path);
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('name="robots" content="noindex"');
  }
});
