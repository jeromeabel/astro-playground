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

// deterministic gradient tint per index (no Math.random)
function tint(i) {
  const hue = (i * 36) % 360;
  return { from: `hsl(${hue} 60% 45%)`, to: `hsl(${(hue + 40) % 360} 60% 25%)` };
}

// continuous-tone, edge-free base: gradient + fractalNoise turbulence (fixed seed)
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

// hard-edged text + thin rule overlay for kind "art" (deterministic caption)
function overlaySvg(caption) {
  const esc = caption.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SRC_W}" height="${SRC_H}">
    <rect x="120" y="${SRC_H - 360}" width="${SRC_W - 240}" height="2" fill="#ffffff"/>
    <text x="120" y="${SRC_H - 220}" font-family="Helvetica, Arial, sans-serif"
      font-size="140" font-weight="700" fill="#ffffff"
      stroke="#000000" stroke-width="3">${esc}</text>
  </svg>`;
}

async function baseBuffer(item, i) {
  if (item.source === "picsum") {
    const url = `https://picsum.photos/seed/${item.id}/${SRC_W}/${SRC_H}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`picsum fetch ${item.id} failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return sharp(Buffer.from(plasmaSvg(i))).jpeg({ quality: 90 }).toBuffer();
}

async function buildItem(item, i) {
  const out = join(SRC_DIR, `${item.id}.jpg`);

  // idempotent: a present source is reused (offline-safe; committed picsum finals)
  let base;
  if (existsSync(out)) {
    base = await readFile(out);
  } else {
    base = await baseBuffer(item, i);
    if (item.kind === "art") {
      base = await sharp(base)
        .composite([{ input: Buffer.from(overlaySvg(item.caption)) }])
        .jpeg({ quality: 90 })
        .toBuffer();
    }
    await sharp(base).resize(SRC_W, SRC_H).jpeg({ quality: 90 }).toFile(out);
    base = await readFile(out);
  }

  // manual width files + baked blur (regenerated when missing; git-ignored)
  for (const w of WIDTHS) {
    const f = join(MANUAL_DIR, `${item.id}-${w}.jpg`);
    if (!existsSync(f)) await sharp(base).resize(w).jpeg({ quality: 78 }).toFile(f);
  }
  const blur = join(MANUAL_DIR, `${item.id}-blur.jpg`);
  if (!existsSync(blur)) {
    await sharp(base).resize(BLUR_W).blur(8).jpeg({ quality: 50 }).toFile(blur);
  }
}

for (let i = 0; i < gallery.length; i++) {
  await buildItem(gallery[i], i);
  console.log(`✓ ${gallery[i].id}`);
}
console.log(
  `\nGenerated ${gallery.length} sources -> src/assets/demo, widths + blur -> public/manual`,
);
