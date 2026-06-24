import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURE_DIR } from "./config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = join(root, "src/assets/demo");
const MANUAL_DIR = join(root, "public/manual");

const SRC_W = 2400;
const SRC_H = 1600; // 3:2
const WIDTHS = [640, 960, 1280, 1920];
const BLUR_W = 32;

const gallery = JSON.parse(
  await readFile(join(root, FEATURE_DIR, "data/gallery.json"), "utf8"),
);

await mkdir(SRC_DIR, { recursive: true });
await mkdir(MANUAL_DIR, { recursive: true });

// Early exit: if all source and manual files are already present, skip generation.
// Sources are committed to git; manual widths are git-ignored but reproduced from sources.
// Re-run after changing gallery.json or deleting files.
const allPresent = gallery.every((item) => {
  if (!existsSync(join(SRC_DIR, `${item.id}.jpg`))) return false;
  for (const w of WIDTHS) {
    if (!existsSync(join(MANUAL_DIR, `${item.id}-${w}.jpg`))) return false;
  }
  return existsSync(join(MANUAL_DIR, `${item.id}-blur.jpg`));
});
if (allPresent) {
  console.log("All images present — skipping generation. Delete files or update gallery.json to regenerate.");
  process.exit(0);
}

// Overlay style env fallback for items without an explicit overlay in gallery.json.
// OVERLAY=a|b|c|combo|d pnpm gen:optimg  (default: combo)
// Re-test a style on the same photos: rm src/assets/demo/art-*.jpg && OVERLAY=b pnpm gen:optimg
const OVERLAYS = ["a", "b", "c", "combo", "d"];
const OVERLAY = (process.env.OVERLAY || "combo").toLowerCase();
if (!OVERLAYS.includes(OVERLAY)) {
  throw new Error(`OVERLAY must be ${OVERLAYS.join("|")}, got "${OVERLAY}"`);
}

const FONT = `ui-monospace, "DejaVu Sans Mono", "Courier New", monospace`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// All overlays are baked at SOURCE resolution (2400px) with shape-rendering=crispEdges
// so the SVG itself has hard edges. Fine details (hairlines, grating, small text) go
// sub-pixel when downscaled — any blur or moiré you see at non-exact widths IS the
// browser resampling, which is the whole point of the pixel-perfect strategy.

// A — high-contrast caption panel: small sharp title + 1px hairlines that go gray off-grid.
function styleA(caption, w, h) {
  const panelH = 300;
  const top = h - panelH;
  return `<rect x="0" y="${top}" width="${w}" height="${panelH}" fill="#ffffff"/>
    <rect x="80" y="${top + 60}" width="${w - 160}" height="1" fill="#000000"/>
    <rect x="80" y="${h - 70}" width="${w - 160}" height="1" fill="#000000"/>
    <text x="80" y="${top + 175}" font-family='${FONT}' font-size="44"
      font-weight="400" fill="#000000">${esc(caption)}</text>`;
}

// B — fine vertical grating (4px bars @2400 → ~1px @640): erupts into moiré when resampled.
// Reference: https://en.wikipedia.org/wiki/Moir%C3%A9_pattern
function styleB(caption, w, h) {
  const bandH = 240;
  const top = h - bandH;
  return `<defs><pattern id="grating" width="8" height="${bandH}" patternUnits="userSpaceOnUse">
      <rect width="4" height="${bandH}" fill="#000000"/></pattern></defs>
    <rect x="0" y="${top}" width="${w}" height="${bandH}" fill="#ffffff"/>
    <rect x="0" y="${top}" width="${w}" height="${bandH - 70}" fill="url(#grating)"/>
    <rect x="0" y="${h - 70}" width="${w}" height="70" fill="#ffffff"/>
    <text x="80" y="${h - 22}" font-family='${FONT}' font-size="40"
      font-weight="400" fill="#000000">${esc(caption)}</text>`;
}

// C — size ladder: the title at 16/24/36/56/84px@2400. Small steps mush, large survives.
function styleC(caption, w, h) {
  const sizes = [84, 56, 36, 24, 16];
  const panelH = 480;
  const top = h - panelH;
  let y = top + 90;
  const lines = sizes
    .map((s) => {
      const t = `<text x="80" y="${y}" font-family='${FONT}' font-size="${s}"
        font-weight="400" fill="#000000">${esc(caption)} · ${s}px</text>`;
      y += s + 18;
      return t;
    })
    .join("\n    ");
  return `<rect x="0" y="${top}" width="${w}" height="${panelH}" fill="#ffffff"/>
    ${lines}`;
}

// combo: the A panel with a thin B grating strip stacked above it.
function comboSvg(caption, w, h) {
  return styleB("", w, h - 300) + styleA(caption, w, h);
}

// D — large bold title (white, stroked black): survives all downscales, readable at 32px.
function styleD(caption, w, h) {
  return `<rect x="120" y="${h - 360}" width="${w - 240}" height="2" fill="#ffffff"/>
    <text x="120" y="${h - 220}" font-family="Helvetica, Arial, sans-serif"
      font-size="140" font-weight="700" fill="#ffffff"
      stroke="#000000" stroke-width="3">${esc(caption)}</text>`;
}

const OVERLAY_STYLES = { a: styleA, b: styleB, c: styleC, combo: comboSvg, d: styleD };

function overlaySvg(style, caption, w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"
    shape-rendering="crispEdges">${OVERLAY_STYLES[style](caption, w, h)}</svg>`;
}

async function picsumBuffer(item) {
  const path = item.picsumId ? `id/${item.picsumId}` : `seed/${item.id}`;
  const url = `https://picsum.photos/${path}/${SRC_W}/${SRC_H}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`picsum fetch ${item.id} failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Offline fallback: deterministic gradient + fractal noise so overlays still work
// when picsum is unreachable. Seed is the item index, not Math.random().
function tint(i) {
  const hue = (i * 36) % 360;
  return { from: `hsl(${hue} 60% 45%)`, to: `hsl(${(hue + 40) % 360} 60% 25%)` };
}
function plasmaSvg(i) {
  const { from, to } = tint(i);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SRC_W}" height="${SRC_H}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${from}"/>
        <stop offset="1" stop-color="${to}"/>
      </linearGradient>
      <filter id="n">
        <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="${i}"/>
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer>
      </filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <rect width="100%" height="100%" filter="url(#n)" opacity="0.55"/>
  </svg>`;
}

async function baseBuffer(item, i) {
  try {
    return await picsumBuffer(item);
  } catch (err) {
    const why = err.cause?.code || err.message;
    console.warn(`  ⚠ ${item.id}: picsum unavailable (${why}) — offline plasma base`);
    return sharp(Buffer.from(plasmaSvg(i))).jpeg({ quality: 90 }).toBuffer();
  }
}

async function buildItem(item, i) {
  const out = join(SRC_DIR, `${item.id}.jpg`);
  const style = (item.overlay || OVERLAY).toLowerCase();
  if (!OVERLAYS.includes(style)) {
    throw new Error(`${item.id}: overlay must be ${OVERLAYS.join("|")}, got "${style}"`);
  }

  // idempotent: a present source is reused (offline-safe after first run)
  let base;
  if (existsSync(out)) {
    base = await readFile(out);
  } else {
    base = await sharp(await baseBuffer(item, i))
      .resize(SRC_W, SRC_H)
      .composite([{ input: Buffer.from(overlaySvg(style, item.caption, SRC_W, SRC_H)) }])
      .jpeg({ quality: 90 })
      .toBuffer();
    await sharp(base).toFile(out);
    base = await readFile(out);
  }

  // manual width files resized from the titled source (title scales with them; git-ignored)
  for (const w of WIDTHS) {
    const f = join(MANUAL_DIR, `${item.id}-${w}.jpg`);
    if (!existsSync(f)) {
      await sharp(base).resize(w).jpeg({ quality: 78 }).toFile(f);
    }
  }
  const blur = join(MANUAL_DIR, `${item.id}-blur.jpg`);
  if (!existsSync(blur)) {
    await sharp(base).resize(BLUR_W).blur(8).jpeg({ quality: 50 }).toFile(blur);
  }
}

for (let i = 0; i < gallery.length; i++) {
  const item = gallery[i];
  await buildItem(item, i);
  console.log(`✓ ${item.id} (overlay ${item.overlay || OVERLAY})`);
}
console.log(
  `\nGenerated ${gallery.length} sources -> src/assets/demo, labeled widths + blur -> public/manual`,
);
