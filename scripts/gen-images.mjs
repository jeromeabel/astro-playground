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
  await readFile(join(root, "src/features/optimg/data/gallery.json"), "utf8"),
);

await mkdir(SRC_DIR, { recursive: true });
await mkdir(MANUAL_DIR, { recursive: true });

// Overlay style for `art` sources: pick which resampling-demo treatment to bake.
// Per item via `overlay` in gallery.json; otherwise the env default applies to all.
//   OVERLAY=a|b|c|combo pnpm gen:optimg   (default: combo)
// Re-test styles on the same photos:
//   rm src/assets/demo/art-*.jpg && pnpm gen:optimg
const OVERLAYS = ["a", "b", "c", "combo"];
const OVERLAY = (process.env.OVERLAY || "combo").toLowerCase();
if (!OVERLAYS.includes(OVERLAY)) {
  throw new Error(`OVERLAY must be ${OVERLAYS.join("|")}, got "${OVERLAY}"`);
}

// Resolve the overlay style for one art item (per-item field wins over env).
function overlayFor(item) {
  const style = (item.overlay || OVERLAY).toLowerCase();
  if (!OVERLAYS.includes(style)) {
    throw new Error(`${item.id}: overlay must be ${OVERLAYS.join("|")}, got "${style}"`);
  }
  return style;
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

// hard-edged art overlay (full-size canvas), selected per item.
function artOverlaySvg(style, caption, w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"
    shape-rendering="crispEdges">${ART_STYLES[style](caption, w, h)}</svg>`;
}

async function picsumBuffer(item) {
  // picsumId pins a specific curated image; otherwise the id is a random seed
  const path = item.picsumId ? `id/${item.picsumId}` : `seed/${item.id}`;
  const url = `https://picsum.photos/${path}/${SRC_W}/${SRC_H}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`picsum fetch ${item.id} failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Offline fallback base: a deterministic continuous-tone image (gradient +
// fixed-seed fractal noise, no hard edges) so overlays — and the resampling
// demo — still work when picsum is unreachable. Same idea as the procedural
// backup generator. No Math.random (seed is the item index).
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

// picsum when reachable; deterministic plasma when it isn't (offline-safe).
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

  // idempotent: a present source is reused (offline-safe after first build)
  let base;
  if (existsSync(out)) {
    base = await readFile(out);
  } else {
    const svg =
      item.kind === "art"
        ? artOverlaySvg(overlayFor(item), item.caption, SRC_W, SRC_H)
        : overlaySvg(item.caption, SRC_W, SRC_H);
    base = await sharp(await baseBuffer(item, i))
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

for (let i = 0; i < gallery.length; i++) {
  const item = gallery[i];
  await buildItem(item, i);
  console.log(`✓ ${item.id}${item.kind === "art" ? ` (overlay ${overlayFor(item)})` : ""}`);
}
console.log(
  `\nGenerated ${gallery.length} free sources -> src/assets/demo, labeled widths + blur -> public/manual`,
);
