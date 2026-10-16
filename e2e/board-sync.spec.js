import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import en from "../src/i18n/messages/en.js";
import ar from "../src/i18n/messages/ar.js";

// Board sync (docs/redesign/BOARD-SYNC.md): what each room's board changed,
// checked in the DOM. With BOARD_SHOTS=<dir> each room also saves its four
// variants (375 / 1440 × EN / AR) to <dir>/<room>/ for the side-by-side with
// the board frames. Run on the "desktop" project only (it sets the viewports).

test.use({ serviceWorkers: "block", reducedMotion: "reduce" });

const SHOTS = process.env.BOARD_SHOTS;
const VIEWS = [["375", { width: 375, height: 812 }], ["1440", { width: 1440, height: 900 }]];

async function shoot(page, room, name) {
  if (!SHOTS) return;
  mkdirSync(`${SHOTS}/${room}`, { recursive: true });
  await page.evaluate(() => globalThis.document.fonts.ready);
  await page.screenshot({ path: `${SHOTS}/${room}/${name}.png`, fullPage: true });
}

test.describe("Homepage (Compounding)", () => {
  test.beforeEach(({ page }, testInfo) => { test.skip(testInfo.project.name !== "desktop", "viewport set per test"); });
  for (const [vname, size] of VIEWS) {
    for (const [lang, path, m] of [["en", "/", en], ["ar", "/ar", ar]]) {
      test(`home ${vname} ${lang}`, async ({ page }) => {
        await page.setViewportSize(size);
        await page.goto(path);
        const h1 = page.getByRole("heading", { level: 1 });
        for (const line of m.site.home.hero) await expect(h1).toContainText(line);
        // A way past the scene for anyone who does not want to scroll it.
        const skip = page.getByRole("link", { name: m.site.compounding.afternoon.skip });
        if (await skip.count()) {
          await expect(skip).toHaveAttribute("href", "#cmp-rooms");
          await expect(page.locator("#cmp-rooms li")).toHaveCount(6);
          await expect(page.locator("#cmp-rooms li").first()).toContainText("I");
        }
        await shoot(page, "homepage", `${vname}-${lang}`);
      });
    }
  }
});
