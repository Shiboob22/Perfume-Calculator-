// Renders the kyphi band's music (scripts/kyphi-music/compose.js, original,
// owned by Kyphira) in headless Chromium and encodes it for the site:
//   node scripts/make-kyphi-music.mjs [seed]
// → public/media/kyphi-music.m4a (96 kbps AAC, loudness -16 LUFS) and the
// loop length to put in src/site/templeSound.js. Needs Homebrew ffmpeg and
// Google Chrome (or CHROMIUM_PATH), as the e2e config does.
/* global window */
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const seed = Number(process.argv[2] ?? 7);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: "chrome" });
try {
  const page = await browser.newPage();
  await page.setContent("<!doctype html><title>kyphi</title>");
  await page.addScriptTag({ content: readFileSync(new URL("./kyphi-music/compose.js", import.meta.url), "utf8") });
  const { wav, seconds, loop, peak } = await page.evaluate((s) => window.renderKyphiMusic(s), seed);
  const dir = mkdtempSync(join(tmpdir(), "kyphi-"));
  const wavPath = join(dir, "kyphi.wav");
  writeFileSync(wavPath, Buffer.from(wav, "base64"));
  const out = new URL("../public/media/kyphi-music.m4a", import.meta.url).pathname;
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", wavPath, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100",
    "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", "-map_metadata", "-1", out]);
  console.log(`seed ${seed}: ${seconds.toFixed(3)} s rendered (peak ${peak.toFixed(2)}), loop ${loop.toFixed(3)} s → ${out}`);
  console.log(`WAV kept for listening: ${wavPath}`);
} finally {
  await browser.close();
}
