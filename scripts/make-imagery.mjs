// The brand photographs and films (brand book "05. Imagery") for the public
// site, made small enough to stay off the critical path:
//   node scripts/make-imagery.mjs <folder with the originals>
// Photos: AVIF (q55) at 640/1280/1920 px wide, capped at the original's width,
// plus one 1280 px JPEG (q72) fallback, via macOS `sips` (no npm dependency). Films: H.264 MP4,
// 720p, no audio, faststart, plus a poster, via ffmpeg (Homebrew, local only).
// Writes public/media/* and src/site/media.json (sizes for aspect ratio and srcset).
// The originals stay out of the repo (about 46 MB).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = process.argv[2];
if (!SRC || !existsSync(SRC)) { console.error("usage: node scripts/make-imagery.mjs <originals folder>"); process.exit(1); }
const OUT = "public/media";
const WIDTHS = [640, 1280, 1920];

// slug → the start and end of the original's file name (the downloads carry a hash)
const PHOTOS = {
  books: ["Books_stacked_beside_resin", "f7e12f2a.jpg"],
  "shelf-wall": ["Amber_glass_perfume_bottles_on", "648439ee.jpg"],
  notebook: ["Leather_notebook_with_fountain_pen", "18fdd2b7.jpg"],
  "bench-dropper": ["Fragrance_blending_app_workbench", "80e28f0e.jpg"],
  "strip-candle": ["Passing_perfume_test_strip", "a57374c0.jpg"],
  cellar: ["Amber_perfume_bottles_on_shelves", "ad2e7067.jpg"],
  "bench-scale": ["Fragrance_blending_app_workbench", "5c8e7c38.jpg"],
  "materials-map": ["Perfumery_materials_arranged_on", "154ebe44.jpg"],
  "lab-table": ["Perfumer_laboratory_table", "17d5af11.jpg"],
  "strip-pass": ["Passing_perfume_test_strip", "d99c41dc.jpg"],
  drop: ["Perfume_drop_falling_into_beaker", "0f61cfc6_2K.jpg"],
  bottles: ["Amber_perfume_bottles_on_shelf_", "3784d126_2K.jpg"],
  incense: ["Incense_smoke_rising_from_burner", "848556b2_2K.jpg"],
  measuring: ["Perfumer_measuring_liquid", "00ce2076_2K.jpg"],
  spraying: ["Man_spraying_perfume_bottle", "ac767677_2K.jpg"],
  temple: ["Carved_Egyptian_temple_wall_relief", "abe3f60b_2K.jpg"],
  "raw-slate": ["Raw_perfumery_materials_on_slate", "e04b07d4_2K.jpg"],
};
const FILMS = {
  incense: ["Incense_smoke_rising_from_burner", "52e338ab.mp4"],
  atomiser: ["Hand_pressing_golden_atomizer_mist", "17ec120c.mp4"],
  sandstone: ["Sunset_light_reveals_sandstone", "a5077097.mp4"],
  perfumery: ["Camera_pushing_toward_perfumery", "dd7ecbd6.mp4"],
};

const files = readdirSync(SRC);
const find = ([head, tail]) => {
  const hit = files.find((f) => f.startsWith(head) && f.endsWith(tail));
  if (!hit) throw new Error(`missing original: ${head}…${tail}`);
  return join(SRC, hit);
};
const sips = (...args) => execFileSync("sips", args, { encoding: "utf8" });
const size = (file) => {
  const out = sips("-g", "pixelWidth", "-g", "pixelHeight", file);
  return [Number(/pixelWidth: (\d+)/.exec(out)[1]), Number(/pixelHeight: (\d+)/.exec(out)[1])];
};

mkdirSync(OUT, { recursive: true });
const manifest = { photos: {}, films: {} };
let bytes = 0;
const add = (f) => { bytes += statSync(f).size; return f; };

for (const [slug, match] of Object.entries(PHOTOS)) {
  const src = find(match);
  const [w0, h0] = size(src);
  const widths = [...new Set(WIDTHS.map((w) => Math.min(w, w0)))];
  for (const w of widths) {
    // sips writes AVIFs with an odd height (e.g. 1920×1071) that Chrome decodes
    // to transparent pixels: resize to PNG, crop the height to even, then encode.
    const tmp = join(OUT, `.${slug}-${w}.png`);
    sips("-s", "format", "png", "--resampleWidth", String(w), src, "--out", tmp);
    const [, h] = size(tmp);
    if (h % 2) sips("-c", String(h - 1), String(w), tmp);
    sips("-s", "format", "avif", "-s", "formatOptions", "55", tmp, "--out", join(OUT, `${slug}-${w}.avif`));
    if (size(join(OUT, `${slug}-${w}.avif`))[1] % 2) throw new Error(`${slug}-${w}.avif: odd height`);
    unlinkSync(tmp);
    add(join(OUT, `${slug}-${w}.avif`));
  }
  // One JPEG for browsers without AVIF (Safari before 16): rare, so one width.
  const fallback = Math.min(1280, w0);
  sips("-s", "format", "jpeg", "-s", "formatOptions", "72", "--resampleWidth", String(fallback), src, "--out", join(OUT, `${slug}.jpg`));
  add(join(OUT, `${slug}.jpg`));
  manifest.photos[slug] = { w: w0, h: h0, widths };
}

for (const [slug, match] of Object.entries(FILMS)) {
  const src = find(match);
  const mp4 = join(OUT, `${slug}.mp4`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-an", "-vf", "scale=-2:720", "-c:v", "libx264",
    "-preset", "slow", "-crf", "28", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4]);
  const poster = join(OUT, `${slug}-poster.jpg`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-frames:v", "1", "-vf", "scale=-2:720", "-q:v", "6", poster]);
  sips("-s", "format", "avif", "-s", "formatOptions", "55", poster, "--out", join(OUT, `${slug}-poster.avif`));
  add(mp4); add(poster); add(join(OUT, `${slug}-poster.avif`));
  const [w, h] = size(poster);
  manifest.films[slug] = { w, h };
}

writeFileSync("src/site/media.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(`make-imagery: ${Object.keys(manifest.photos).length} photos, ${Object.keys(manifest.films).length} films, ${Math.round(bytes / 1024)} KiB in ${OUT}`);
