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

// hard-edged caption + "W×H px" baked onto an art source (full-size canvas).
// Hard edges make resampling blur visible; the dimensions identify the file.
function overlaySvg(caption, w, h) {
  const esc = caption.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect x="120" y="${h - 360}" width="${w - 240}" height="2" fill="#ffffff"/>
    <text x="120" y="${h - 220}" font-family="Helvetica, Arial, sans-serif"
      font-size="140" font-weight="700" fill="#ffffff"
      stroke="#000000" stroke-width="3">${esc} — ${w}×${h} px</text>
  </svg>`;
}

// small hard-edged "W×H px" badge baked into a single manual width file —
// the file literally displays its own served size ("which image loaded").
function dimBadgeSvg(w, h) {
  const fontSize = Math.max(18, Math.round(w / 16));
  const pad = Math.round(fontSize * 0.4);
  const stroke = Math.max(1, Math.round(fontSize / 24));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <text x="${pad}" y="${fontSize + pad}" font-family="Helvetica, Arial, sans-serif"
      font-size="${fontSize}" font-weight="700" fill="#ffffff"
      stroke="#000000" stroke-width="${stroke}">${w}×${h} px</text>
  </svg>`;
}

async function picsumBuffer(item) {
  const url = `https://picsum.photos/seed/${item.id}/${SRC_W}/${SRC_H}`;
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
    base = await sharp(await picsumBuffer(item))
      .resize(SRC_W, SRC_H)
      .jpeg({ quality: 90 })
      .toBuffer();
    if (item.kind === "art") {
      base = await sharp(base)
        .composite([{ input: Buffer.from(overlaySvg(item.caption, SRC_W, SRC_H)) }])
        .jpeg({ quality: 90 })
        .toBuffer();
    }
    await sharp(base).toFile(out);
    base = await readFile(out);
  }

  // manual width files, each baked with its own "W×H px" label (git-ignored)
  for (const w of WIDTHS) {
    const f = join(MANUAL_DIR, `${item.id}-${w}.jpg`);
    if (!existsSync(f)) {
      const h = Math.round((w * SRC_H) / SRC_W);
      await sharp(base)
        .resize(w)
        .composite([{ input: Buffer.from(dimBadgeSvg(w, h)) }])
        .jpeg({ quality: 78 })
        .toFile(f);
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
