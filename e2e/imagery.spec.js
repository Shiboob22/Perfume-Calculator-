import { test, expect } from "@playwright/test";

test.use({ serviceWorkers: "block" });

// The brand photographs and films (src/site/Imagery.jsx), behind the
// `imagery` device flag, against the production build.
const flags = (page, names = ["imagery", "compounding"]) =>
  page.addInitScript((list) => {
    for (const n of list) localStorage.setItem(`kyphira.flag.${n}`, "1");
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
  }, names);

test("flag off: no photos or films on the home page", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator('picture source[type="image/avif"]')).toHaveCount(0);
  await expect(page.locator("video")).toHaveCount(0);
});

test("hero photo: eager, high priority, decoded, and the hero in the dark palette", async ({ page }) => {
  await flags(page);
  await page.goto("/");
  const img = page.locator('[data-stage="reading"] picture img');
  await expect(img).toHaveAttribute("loading", "eager");
  await expect(img).toHaveAttribute("fetchpriority", "high");
  await expect.poll(() => img.evaluate((i) => i.complete && i.naturalWidth > 0)).toBe(true);
  // A decoded AVIF with real pixels (sips once wrote files Chrome drew as transparent).
  const painted = await img.evaluate((i) => {
    const c = document.createElement("canvas"); c.width = 8; c.height = 8;
    const x = c.getContext("2d"); x.drawImage(i, 0, 0, 8, 8);
    return x.getImageData(0, 0, 8, 8).data.some((v) => v > 0);
  });
  expect(painted).toBe(true);
  await expect(page.locator('[data-stage="reading"]')).toHaveClass(/kx-dark/);
});

test("films: nothing loads off screen; near the screen it plays and can be paused", async ({ page }) => {
  await flags(page);
  await page.goto("/");
  await expect(page.locator("video")).toHaveCount(0);
  const quote = page.locator("blockquote");
  await quote.scrollIntoViewIfNeeded();
  const video = quote.locator("video");
  await expect(video).toHaveCount(1);
  await expect.poll(() => video.evaluate((v) => !v.paused)).toBe(true);
  await quote.getByRole("button", { name: "Pause the film" }).click();
  await expect.poll(() => video.evaluate((v) => v.paused)).toBe(true);
  await expect(quote.getByRole("button", { name: "Play the film" })).toBeVisible();
});

test("reduced motion: films show only the still poster", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await flags(page);
  await page.goto("/");
  const quote = page.locator("blockquote");
  await quote.scrollIntoViewIfNeeded();
  await expect(quote.locator('img[src$="incense-poster.avif"]')).toHaveCount(1);
  await expect(page.locator("video")).toHaveCount(0);
});
