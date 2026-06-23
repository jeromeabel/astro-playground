import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = join(root, "src/assets/demo");
const MANUAL_DIR = join(root, "public/manual");

const SRC_W = 2400;
const SRC_H = 1600; // 3:2
const WIDTHS = [640, 960, 1280, 1920];
const BLUR_W = 32;

const gallery = JSON.parse(
  await readFile(join(root, "src/data/gallery.json"), "utf8"),
);

await mkdir(SRC_DIR, { recursive: true });
await mkdir(MANUAL_DIR, { recursive: true });

// Overlay style for `art` sources: pick which resampling-demo treatment to bake.
//   OVERLAY=a|b|c|combo pnpm gen:images   (default: combo)
// Re-test a style on the same photos:
//   rm src/assets/demo/art-*.jpg && OVERLAY=b pnpm gen:images
const OVERLAY = (process.env.OVERLAY || "combo").toLowerCase();
if (!["a", "b", "c", "combo"].includes(OVERLAY)) {
  throw new Error(`OVERLAY must be a|b|c|combo, got "${OVERLAY}"`);
}

const FONT = `ui-monospace, "DejaVu Sans Mono", "Courier New", monospace`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// large bold title baked onto every PHOTO source (survives downscaling).
function overlaySvg(caption, w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect x="120" y="${h - 360}" width="${w - 240}" height="2" fill="#ffffff"/>
    <text x="120" y="${h - 220}" font-family="Helvetica, Arial, sans-serif"
      font-size="140" font-weight="700" fill="#ffffff"
      stroke="#000000" stroke-width="3">${esc(caption)}</text>
  </svg>`;
}

// All art overlays are baked at SOURCE resolution (2400px). Their fine, hard-edged
// detail turns sub-pixel when the file is downscaled to a grid slot — so any
// blur/moiré you see at non-exact widths IS the resampling, which is the whole
// point of the pixel-perfect strategy. shape-rendering=crispEdges keeps the SVG
// itself hard so no softening comes from the overlay.

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

// combo (default): the A panel with a thin B grating strip stacked above it.
function comboSvg(caption, w, h) {
  return styleB("", w, h - 300) + styleA(caption, w, h);
}

const ART_STYLES = { a: styleA, b: styleB, c: styleC, combo: comboSvg };

// hard-edged art overlay (full-size canvas), selected by OVERLAY.
function artOverlaySvg(caption, w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"
    shape-rendering="crispEdges">${ART_STYLES[OVERLAY](caption, w, h)}</svg>`;
}

async function picsumBuffer(item) {
  // picsumId pins a specific curated image; otherwise the id is a random seed
  const path = item.picsumId ? `id/${item.picsumId}` : `seed/${item.id}`;
  const url = `https://picsum.photos/${path}/${SRC_W}/${SRC_H}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`picsum fetch ${item.id} failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function buildItem(item) {
  const out = join(SRC_DIR, `${item.id}.jpg`);

  // idempotent: a present source is reused (offline-safe after first fetch)
  let base;
  if (existsSync(out)) {
    base = await readFile(out);
  } else {
    const svg =
      item.kind === "art"
        ? artOverlaySvg(item.caption, SRC_W, SRC_H)
        : overlaySvg(item.caption, SRC_W, SRC_H);
    base = await sharp(await picsumBuffer(item))
      .resize(SRC_W, SRC_H)
      .composite([{ input: Buffer.from(svg) }])
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

for (const item of gallery) {
  await buildItem(item);
  console.log(`✓ ${item.id}`);
}
console.log(
  `\nGenerated ${gallery.length} free sources -> src/assets/demo, labeled widths + blur -> public/manual`,
);
