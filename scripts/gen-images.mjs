import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURE_DIR } from "./config.mjs";
import { p0, bar, MOIRE_SLOTS } from "./moire.mjs";
import { MANUAL_WIDTHS as WIDTHS } from "./manual-widths.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = join(root, "src/assets/optimg");
const MANUAL_DIR = join(root, "public/manual");

const SRC_W = 2400;
const SRC_H = 1600; // 3:2
const BLUR_W = 32;

const gallery = JSON.parse(
  await readFile(join(root, FEATURE_DIR, "data/gallery.json"), "utf8"),
);

await mkdir(SRC_DIR, { recursive: true });
await mkdir(MANUAL_DIR, { recursive: true });

// FORCE env: override the early-exit and re-bake specific or all images.
//   FORCE=1 | FORCE=all    → re-bake every image (overwrite source + manual files)
//   FORCE=photo-04,photo-05 → re-bake only those ids
//   FORCE unset             → default early-exit behaviour (reuse existing files)
const validIds = new Set(gallery.map((item) => item.id));
const forceRaw = process.env.FORCE;
let forceAll = false;
const forceIds = new Set();
if (forceRaw) {
  if (forceRaw === "1" || forceRaw === "all") {
    forceAll = true;
  } else {
    for (const id of forceRaw.split(",").map((s) => s.trim())) {
      if (!validIds.has(id)) {
        console.error(`FORCE: unknown id "${id}". Valid ids: ${[...validIds].join(", ")}`);
        process.exit(1);
      }
      forceIds.add(id);
    }
  }
}

// Early exit: if all source and manual files are already present, skip generation.
// Sources are committed to git; manual widths are git-ignored but reproduced from sources.
// Re-run after changing gallery.json or deleting files.
const allPresent = !forceAll && forceIds.size === 0 && gallery.every((item) => {
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
// OVERLAY=a|b|c|combo|d|e pnpm gen:optimg  (default: combo)
// Re-test a style on the same photos: rm src/assets/optimg/photo-{11..20}.jpg && OVERLAY=b pnpm gen:optimg
const OVERLAYS = ["a", "b", "c", "combo", "d", "e"];
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

// E — two-scale moiré: periods derived from slot widths so each band beats at its
// target slot (auto → moiré) and lands crisp at pixel-perfect slot×DPR.
//   grid band  period p0(316)=38, bar=19 → 5 CSS px at the 316px lg 3-col thumb
//   cover band period p0(976)=12, bar= 6 → 5 CSS px at the 976px solo page
// Periods come from scripts/moire.mjs (MOIRE_SLOTS guarded by contract test).
function styleE(caption, w, h) {
  const band = 150;
  const gratH = 116; // grating strip; the rest of each band is the white label line
  const cTop = h - band * 2; // grid band (reads at 3-col thumb)
  const fTop = h - band; // cover band (reads at solo page)
  const gP = p0(MOIRE_SLOTS.grid);   // 38
  const gB = bar(MOIRE_SLOTS.grid);  // 19
  const cP = p0(MOIRE_SLOTS.cover);  // 12
  const cB = bar(MOIRE_SLOTS.cover); // 6
  const pat = (id, barW, period) =>
    `<pattern id="${id}" width="${period}" height="${gratH}" patternUnits="userSpaceOnUse">
       <rect width="${barW}" height="${gratH}" fill="#000000"/></pattern>`;
  const label = (y, t) =>
    `<text x="80" y="${y}" font-family='${FONT}' font-size="30" font-weight="400"
      fill="#000000">${esc(t)}</text>`;
  return `<defs>${pat("gC", gB, gP)}${pat("gF", cB, cP)}</defs>
    <rect x="0" y="${cTop}" width="${w}" height="${band * 2}" fill="#ffffff"/>
    <rect x="0" y="${cTop}" width="${w}" height="${gratH}" fill="url(#gC)"/>
    ${label(cTop + band - 12, `grid ${gP}px · reads at 3-col thumb · ${caption}`)}
    <rect x="0" y="${fTop}" width="${w}" height="${gratH}" fill="url(#gF)"/>
    ${label(fTop + band - 12, `cover ${cP}px · reads at solo page`)}`;
}

const OVERLAY_STYLES = { a: styleA, b: styleB, c: styleC, combo: comboSvg, d: styleD, e: styleE };

function overlaySvg(style, caption, w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"
    shape-rendering="crispEdges">${OVERLAY_STYLES[style](caption, w, h)}</svg>`;
}

const ORIGINAL_DIR = join(SRC_DIR, "original");
async function originalBuffer(item) {
  const f = join(ORIGINAL_DIR, `${item.id}.jpg`);
  if (!existsSync(f)) {
    throw new Error(
      `missing original for ${item.id}: ${f}\n` +
        `run \`pnpm fetch:originals\` once (raw originals are committed, not re-fetched on build)`,
    );
  }
  return readFile(f);
}

async function buildItem(item, i, force = false) {
  const out = join(SRC_DIR, `${item.id}.jpg`);
  const style = (item.overlay || OVERLAY).toLowerCase();
  if (!OVERLAYS.includes(style)) {
    throw new Error(`${item.id}: overlay must be ${OVERLAYS.join("|")}, got "${style}"`);
  }

  // idempotent: a present source is reused (offline-safe after first run).
  // force=true skips the existsSync guard and overwrites.
  let base;
  if (!force && existsSync(out)) {
    base = await readFile(out);
  } else {
    base = await sharp(await originalBuffer(item))
      .resize(SRC_W, SRC_H) // normalize any original aspect/size → 3:2 2400px
      .composite([{ input: Buffer.from(overlaySvg(style, item.caption, SRC_W, SRC_H)) }])
      .jpeg({ quality: 90 })
      .toBuffer();
    await sharp(base).toFile(out);
    base = await readFile(out);
  }

  // manual width files resized from the titled source (title scales with them; git-ignored)
  for (const w of WIDTHS) {
    const f = join(MANUAL_DIR, `${item.id}-${w}.jpg`);
    if (force || !existsSync(f)) {
      await sharp(base).resize(w).jpeg({ quality: 78 }).toFile(f);
    }
  }
  const blur = join(MANUAL_DIR, `${item.id}-blur.jpg`);
  if (force || !existsSync(blur)) {
    await sharp(base).resize(BLUR_W).blur(8).jpeg({ quality: 50 }).toFile(blur);
  }
}

for (let i = 0; i < gallery.length; i++) {
  const item = gallery[i];
  const force = forceAll || forceIds.has(item.id);
  await buildItem(item, i, force);
  console.log(`✓ ${item.id} (overlay ${item.overlay || OVERLAY})`);
}
console.log(
  `\nGenerated ${gallery.length} sources -> src/assets/optimg, labeled widths + blur -> public/manual`,
);
