# Images Performance Example Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `/images` example to astro-playground that turns the Web Performance Part 4 blog post's image-optimization claims into runnable, measurable routes (one strategy per route, from unoptimized to fully optimized) backed by a deterministic 20-image dataset and a light Lighthouse harness.

**Architecture:** A single JSON manifest drives both a `sharp` dataset generator and the routes, so the dataset and the demo never drift. One strategy-switched component (`DemoImage.astro`) renders all five techniques. Routes are static (build-time Sharp output to `/_astro/`), mirroring the existing `/residents` example's structure (data file → hub → list → dynamic detail). A no-Python measurement step runs Lighthouse against `pnpm preview` and prints a median table.

**Tech Stack:** Astro 6.4.8, Tailwind CSS v4 (via `@tailwindcss/vite`), `sharp` (dataset generator), `astro:assets` (`<Picture>`, `getImage`), Lighthouse 13 (`pnpm dlx`), Node `fetch`/`fs` for scripts.

## Global Constraints

- **Astro pinned to `^6.4.8`.** Do NOT upgrade to 7.x. The image API (`astro:assets`, `<Picture>`, `getImage`, `responsiveStyles`, `image.layout`, `data-astro-fit`/`data-astro-image`) is identical in v6/v7; v7 would force `@astrojs/netlify` to v8 for zero image benefit.
- **Package manager is `pnpm`.** No `npm`/`yarn`.
- **No test framework exists in this project** (no vitest/jest). Verification is by running the generator and asserting file outputs, by `astro check`, by `pnpm build`, and by `pnpm preview` + `curl`. Do not introduce a test runner.
- **Imports are relative.** No path aliases are configured (`tsconfig.json` only extends `astro/tsconfigs/strict`). Match the `/residents` example: relative paths like `../../../data/gallery`.
- **Routes are static.** Do NOT set `export const prerender = false` on the `/images` routes (that opts into SSR). Static is the default and is required so output lands in `/_astro/`.
- **Single source of truth:** `src/data/gallery.json` is the only place the 20-item list is defined. `gallery.ts` types it; `gen-images.mjs` reads it. Never hand-duplicate the list.
- **Deterministic dataset:** no `Math.random`. Picsum uses seeded URLs; generated images use a fixed `feTurbulence` seed; overlay captions are fixed strings.
- **Styling:** reuse `Layout.astro` and Tailwind 4 utility classes. Do not add a `tailwind.config.js` or restructure the shell.

---

### Task 1: Dataset manifest

Defines the 20-item dataset that everything else consumes. 5 items per `(kind × source)` cell: `photo-picsum`, `photo-generated`, `art-picsum`, `art-generated`. IDs are `photo-01..photo-10` and `art-01..art-10`; within each kind, `-01..-05` are picsum, `-06..-10` are generated.

**Files:**
- Create: `src/data/gallery.json`
- Create: `src/data/gallery.ts`

**Interfaces:**
- Produces: `interface GalleryItem { id: string; kind: "photo" | "art"; source: "picsum" | "generated"; alt: string; caption: string }` and `export const gallery: GalleryItem[]` (20 entries). Consumed by `gen-images.mjs` (via the JSON), `DemoImage.astro`, and all `/images` routes.

- [ ] **Step 1: Create the manifest data**

Create `src/data/gallery.json`:

```json
[
  { "id": "photo-01", "kind": "photo", "source": "picsum",    "alt": "Continuous-tone landscape photograph, sample 01", "caption": "Coastline at dawn" },
  { "id": "photo-02", "kind": "photo", "source": "picsum",    "alt": "Continuous-tone landscape photograph, sample 02", "caption": "Pine ridge in fog" },
  { "id": "photo-03", "kind": "photo", "source": "picsum",    "alt": "Continuous-tone landscape photograph, sample 03", "caption": "River bend at noon" },
  { "id": "photo-04", "kind": "photo", "source": "picsum",    "alt": "Continuous-tone landscape photograph, sample 04", "caption": "Desert dunes" },
  { "id": "photo-05", "kind": "photo", "source": "picsum",    "alt": "Continuous-tone landscape photograph, sample 05", "caption": "City skyline dusk" },
  { "id": "photo-06", "kind": "photo", "source": "generated", "alt": "Generated continuous-tone plasma field, sample 06", "caption": "Plasma field 06" },
  { "id": "photo-07", "kind": "photo", "source": "generated", "alt": "Generated continuous-tone plasma field, sample 07", "caption": "Plasma field 07" },
  { "id": "photo-08", "kind": "photo", "source": "generated", "alt": "Generated continuous-tone plasma field, sample 08", "caption": "Plasma field 08" },
  { "id": "photo-09", "kind": "photo", "source": "generated", "alt": "Generated continuous-tone plasma field, sample 09", "caption": "Plasma field 09" },
  { "id": "photo-10", "kind": "photo", "source": "generated", "alt": "Generated continuous-tone plasma field, sample 10", "caption": "Plasma field 10" },
  { "id": "art-01", "kind": "art", "source": "picsum",    "alt": "Photograph with hard-edged text and rule overlay, sample 01", "caption": "SHARP EDGES 01" },
  { "id": "art-02", "kind": "art", "source": "picsum",    "alt": "Photograph with hard-edged text and rule overlay, sample 02", "caption": "SHARP EDGES 02" },
  { "id": "art-03", "kind": "art", "source": "picsum",    "alt": "Photograph with hard-edged text and rule overlay, sample 03", "caption": "SHARP EDGES 03" },
  { "id": "art-04", "kind": "art", "source": "picsum",    "alt": "Photograph with hard-edged text and rule overlay, sample 04", "caption": "SHARP EDGES 04" },
  { "id": "art-05", "kind": "art", "source": "picsum",    "alt": "Photograph with hard-edged text and rule overlay, sample 05", "caption": "SHARP EDGES 05" },
  { "id": "art-06", "kind": "art", "source": "generated", "alt": "Generated plasma with hard-edged text and rule overlay, sample 06", "caption": "SHARP EDGES 06" },
  { "id": "art-07", "kind": "art", "source": "generated", "alt": "Generated plasma with hard-edged text and rule overlay, sample 07", "caption": "SHARP EDGES 07" },
  { "id": "art-08", "kind": "art", "source": "generated", "alt": "Generated plasma with hard-edged text and rule overlay, sample 08", "caption": "SHARP EDGES 08" },
  { "id": "art-09", "kind": "art", "source": "generated", "alt": "Generated plasma with hard-edged text and rule overlay, sample 09", "caption": "SHARP EDGES 09" },
  { "id": "art-10", "kind": "art", "source": "generated", "alt": "Generated plasma with hard-edged text and rule overlay, sample 10", "caption": "SHARP EDGES 10" }
]
```

- [ ] **Step 2: Create the typed wrapper**

Create `src/data/gallery.ts`:

```ts
import data from "./gallery.json";

export interface GalleryItem {
  id: string; // "photo-01" | "art-01" ...
  kind: "photo" | "art"; // "art" => composited text + rule overlay
  source: "picsum" | "generated"; // drives gen-images.mjs branch
  alt: string;
  caption: string; // also the overlay text for kind "art"
}

export const gallery = data as unknown as GalleryItem[];
```

- [ ] **Step 3: Verify the manifest shape and balance**

Run:

```bash
node --input-type=commonjs -e "const fs=require('fs');const g=JSON.parse(fs.readFileSync('src/data/gallery.json','utf8'));const c={};g.forEach(i=>{const k=i.kind+'-'+i.source;c[k]=(c[k]||0)+1});console.log(g.length, JSON.stringify(c));const ids=new Set(g.map(i=>i.id));if(ids.size!==g.length)throw new Error('duplicate id');"
```

Expected output:

```
20 {"photo-picsum":5,"photo-generated":5,"art-picsum":5,"art-generated":5}
```

(No "duplicate id" error thrown.)

- [ ] **Step 4: Commit**

```bash
git add src/data/gallery.json src/data/gallery.ts
git commit -m "feat(images): add 20-item gallery manifest"
```

---

### Task 2: Image generator + build wiring

Creates the deterministic dataset generator and wires it into the build. Produces the 20 source images (`src/assets/demo/<id>.jpg`, ~2400×1600, deliberately heavy) and the framework-free manual width files + baked blur (`public/manual/<id>-{640,960,1280,1920}.jpg`, `<id>-blur.jpg`). Picsum sources are committed (deterministic + small, offline-safe after first gen); generated sources and all `public/manual/` files are git-ignored and reproduced on demand.

**Files:**
- Create: `scripts/gen-images.mjs`
- Modify: `package.json` (add `sharp` devDep, `gen:images` script, update `build`)
- Modify: `astro.config.mjs` (add `image.responsiveStyles`)
- Modify: `.gitignore` (ignore generated sources + `public/manual/`)

**Interfaces:**
- Consumes: `src/data/gallery.json` (Task 1).
- Produces: files in `src/assets/demo/` (20 `<id>.jpg`) and `public/manual/` (per id: `-640.jpg`, `-960.jpg`, `-1280.jpg`, `-1920.jpg`, `-blur.jpg`). Consumed by the routes (Task 6) and the `manual` strategy.

- [ ] **Step 1: Add `sharp` as a dev dependency**

Run:

```bash
pnpm add -D sharp
```

Expected: `sharp` appears under `devDependencies` in `package.json`; `pnpm-lock.yaml` updated.

- [ ] **Step 2: Write the generator**

Create `scripts/gen-images.mjs`:

```js
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
```

- [ ] **Step 3: Wire scripts into `package.json`**

In `package.json`, add `gen:images` and make `build` run it first. Replace the `scripts` block with:

```json
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "gen:images": "node scripts/gen-images.mjs",
    "build": "pnpm gen:images && astro check && astro build",
    "preview": "astro preview",
    "astro": "astro"
  },
```

- [ ] **Step 4: Enable responsive styles in `astro.config.mjs`**

Edit `astro.config.mjs` to add the `image` option (default `responsiveStyles` is `false`; without it the `<Picture>` routes are not actually responsive). Result:

```javascript
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  adapter: netlify(),
  image: {
    responsiveStyles: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
```

- [ ] **Step 5: Git-ignore generated artifacts**

Append to `.gitignore`:

```
# images example — generated artifacts (reproduced by `pnpm gen:images`)
public/manual/
src/assets/demo/photo-06.jpg
src/assets/demo/photo-07.jpg
src/assets/demo/photo-08.jpg
src/assets/demo/photo-09.jpg
src/assets/demo/photo-10.jpg
src/assets/demo/art-06.jpg
src/assets/demo/art-07.jpg
src/assets/demo/art-08.jpg
src/assets/demo/art-09.jpg
src/assets/demo/art-10.jpg
```

- [ ] **Step 6: Run the generator and verify outputs**

Run:

```bash
pnpm gen:images
```

Expected: 20 `✓ <id>` lines, then the summary. Then verify file counts and dimensions:

```bash
ls src/assets/demo/*.jpg | wc -l
ls public/manual/*.jpg | wc -l
node -e "require('sharp')('src/assets/demo/photo-01.jpg').metadata().then(m=>console.log(m.width+'x'+m.height))"
node -e "require('sharp')('public/manual/photo-01-640.jpg').metadata().then(m=>console.log(m.width+'x'+m.height))"
```

Expected:
- `20` source images.
- `100` manual files (20 items × 5 files each).
- `2400x1600` for the source.
- `640x427` for the 640-width manual file.

- [ ] **Step 7: Verify idempotency (re-run is a no-op, offline-safe)**

Run again:

```bash
pnpm gen:images
```

Expected: completes without re-fetching (no network errors even if offline for the second run), file counts unchanged (still 20 / 100).

- [ ] **Step 8: Commit (committing only the picsum sources)**

```bash
git add scripts/gen-images.mjs package.json pnpm-lock.yaml astro.config.mjs .gitignore
git add src/assets/demo/photo-01.jpg src/assets/demo/photo-02.jpg src/assets/demo/photo-03.jpg src/assets/demo/photo-04.jpg src/assets/demo/photo-05.jpg
git add src/assets/demo/art-01.jpg src/assets/demo/art-02.jpg src/assets/demo/art-03.jpg src/assets/demo/art-04.jpg src/assets/demo/art-05.jpg
git status --short
git commit -m "feat(images): add deterministic dataset generator and build wiring"
```

Expected: `git status --short` shows the 10 generated `src/assets/demo/{photo,art}-0[6-9],-10.jpg` and `public/manual/` as ignored (not staged, not listed as untracked). Only the 10 picsum sources + script/config are committed.

---

### Task 3: Layout-token sizes helper

A single source for the grid's layout tokens and the `sizes` strings, so the `pixel-perfect` route's served widths land on the real layout slots (no resampling) and the grid CSS and `sizes` attribute derive from the same numbers.

**Files:**
- Create: `src/lib/sizes.ts`

**Interfaces:**
- Produces: `gridSizes: string` (approximate, for `auto`), `pixelPerfectGridSizes: string` (token-derived, for `pixel-perfect`), `detailSizes: string` (for `cover` images), and `layout` (the raw tokens). Consumed by `DemoImage.astro` (Task 5) and the list grid CSS (Task 6).

- [ ] **Step 1: Write the helper**

Create `src/lib/sizes.ts`:

```ts
// Layout tokens — single source for the grid CSS and the responsive `sizes`.
export const layout = {
  maxWidth: 768, // px, page container (max-w-3xl-ish)
  padding: 24, // px, horizontal padding each side (px-6)
  gap: 16, // px, grid gap (gap-4)
  breakpoints: { md: 768, lg: 1024 },
};

// width of one grid cell at a given column count within the container
function cellWidth(cols: number): number {
  const inner = layout.maxWidth - layout.padding * 2;
  return Math.floor((inner - layout.gap * (cols - 1)) / cols);
}

// Approximate sizes for the `auto` route — the "good enough" framework default.
export const gridSizes = "(min-width: 768px) 33vw, 100vw";

// Token-derived sizes for `pixel-perfect`: the served file lands on the real slot.
// Grid is 1 col (<md), 2 cols (md), 3 cols (lg+).
export const pixelPerfectGridSizes = [
  `(min-width: ${layout.breakpoints.lg}px) ${cellWidth(3)}px`,
  `(min-width: ${layout.breakpoints.md}px) ${cellWidth(2)}px`,
  `calc(100vw - ${layout.padding * 2}px)`,
].join(", ");

// Detail (`cover`) image spans the container width.
export const detailSizes = [
  `(min-width: ${layout.maxWidth}px) ${layout.maxWidth - layout.padding * 2}px`,
  `calc(100vw - ${layout.padding * 2}px)`,
].join(", ");
```

- [ ] **Step 2: Verify the computed strings**

Run:

```bash
npx tsx --eval "import('./src/lib/sizes.ts').then(m=>console.log(JSON.stringify({grid:m.gridSizes,pp:m.pixelPerfectGridSizes,detail:m.detailSizes})))" 2>/dev/null || node --input-type=module -e "const cw=c=>Math.floor((720-16*(c-1))/c);console.log('lg cell',cw(3),'md cell',cw(2))"
```

Expected (the fallback always runs if `tsx` is absent): `lg cell 229 md cell 352`. If `tsx` is present, also prints the three full strings — confirm `pp` contains `229px` and `352px`, and `detail` contains `720px`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/sizes.ts
git commit -m "feat(images): add layout-token sizes helper"
```

---

### Task 4: LQIP reveal script

Client script that fades revealed images in on `load`, with an `img.complete` cache guard so cached images skip the animation. Bound on both `DOMContentLoaded` and `astro:page-load` so it works with or without View Transitions (the playground `Layout` has no `ClientRouter` today, but the blog teaches the VT-safe form).

**Files:**
- Create: `src/scripts/reveal-img.ts`

**Interfaces:**
- Produces: a self-registering module (no exports). Consumed by `DemoImage.astro`'s `lqip` markup (the `img.reveal-img` selector + `opacity:0` inline style) and imported via `<script>` in the routes (Task 6).

- [ ] **Step 1: Write the script**

Create `src/scripts/reveal-img.ts`:

```ts
function reveal(img: HTMLImageElement): void {
  // cache guard: already-decoded images skip the fade
  if (img.complete && img.naturalHeight !== 0) {
    img.style.opacity = "1";
    return;
  }
  const show = () => {
    img.style.opacity = "1";
  };
  img.addEventListener("load", show, { once: true });
  img.addEventListener("error", show, { once: true }); // never leave it invisible
}

function init(): void {
  document
    .querySelectorAll<HTMLImageElement>("img.reveal-img")
    .forEach(reveal);
}

document.addEventListener("DOMContentLoaded", init);
document.addEventListener("astro:page-load", init); // VT-safe; harmless without ClientRouter
```

- [ ] **Step 2: Verify it type-checks**

Run:

```bash
pnpm exec astro check
```

Expected: `0 errors` (warnings unrelated to this file are acceptable). This type-checks the new script against the DOM lib.

- [ ] **Step 3: Commit**

```bash
git add src/scripts/reveal-img.ts
git commit -m "feat(images): add LQIP reveal script with cache guard"
```

---

### Task 5: DemoImage component

The single teaching surface. Switches on `strategy` to emit the correct markup for each technique. This is where each blog claim becomes concrete markup.

**Files:**
- Create: `src/components/DemoImage.astro`

**Interfaces:**
- Consumes: `GalleryItem` (Task 1), `gridSizes`/`pixelPerfectGridSizes`/`detailSizes` (Task 3), the `public/manual/<id>-*.jpg` files (Task 2), `reveal-img.ts` behavior (Task 4 — the `reveal-img` class + `opacity:0`).
- Produces: `interface Props { item: GalleryItem; strategy: "naive" | "manual" | "auto" | "pixel-perfect" | "lqip"; type: "thumb" | "cover"; image?: ImageMetadata }`. `image` is required for every strategy except `manual`. Consumed by the routes (Task 6).

- [ ] **Step 1: Write the component**

Create `src/components/DemoImage.astro`:

```astro
---
import { Picture, getImage } from "astro:assets";
import type { ImageMetadata } from "astro";
import type { GalleryItem } from "../data/gallery";
import { gridSizes, pixelPerfectGridSizes, detailSizes } from "../lib/sizes";

interface Props {
  item: GalleryItem;
  strategy: "naive" | "manual" | "auto" | "pixel-perfect" | "lqip";
  type: "thumb" | "cover";
  image?: ImageMetadata; // required for every strategy except "manual"
}

const { item, strategy, type, image } = Astro.props;

const isCover = type === "cover";
const loading = isCover ? "eager" : "lazy";
const fetchpriority = isCover ? "high" : "auto";
const width = isCover ? 1280 : 640;
const height = isCover ? 853 : 427; // 3:2

// auto + lqip use the approximate default; pixel-perfect uses the token-derived string
const autoSizes = isCover ? detailSizes : gridSizes;
const ppSizes = isCover ? detailSizes : pixelPerfectGridSizes;

// LQIP: build a 32px blurred placeholder at build time
let placeholder: string | undefined;
if (strategy === "lqip" && image) {
  const lq = await getImage({ src: image, width: 32, height: 21, format: "webp" });
  placeholder = lq.src;
}
---

{
  strategy === "naive" && image && (
    /* floor: no srcset, no sizes, no width/height -> worst bytes + CLS */
    <img src={image.src} alt={item.alt} class="block w-full" />
  )
}

{
  strategy === "manual" && (
    /* bash era done right: hand-cut widths + baked blur, manual width/height */
    <img
      src={`/manual/${item.id}-1280.jpg`}
      srcset={`/manual/${item.id}-640.jpg 640w, /manual/${item.id}-960.jpg 960w, /manual/${item.id}-1280.jpg 1280w, /manual/${item.id}-1920.jpg 1920w`}
      sizes={autoSizes}
      width={width}
      height={height}
      loading={loading}
      fetchpriority={fetchpriority}
      alt={item.alt}
      class="block w-full bg-cover"
      style={`background-image:url(/manual/${item.id}-blur.jpg)`}
    />
  )
}

{
  strategy === "auto" && image && (
    /* toil deletion: formats + srcset + sizes + auto width/height (CLS fixed) */
    <Picture
      src={image}
      formats={["avif", "webp"]}
      layout="constrained"
      width={width}
      sizes={autoSizes}
      loading={loading}
      fetchpriority={fetchpriority}
      alt={item.alt}
      class="block w-full"
    />
  )
}

{
  strategy === "pixel-perfect" && image && (
    /* sizes from layout tokens -> served file lands on the slot, no resampling */
    <Picture
      src={image}
      formats={["avif", "webp"]}
      layout="constrained"
      width={width}
      sizes={ppSizes}
      loading={loading}
      fetchpriority={fetchpriority}
      alt={item.alt}
      class="block w-full"
    />
  )
}

{
  strategy === "lqip" && image && (
    /* auto + getImage placeholder + opacity:0 fade (reveal-img.ts), cache-guarded */
    <Picture
      src={image}
      formats={["avif", "webp"]}
      layout="constrained"
      width={width}
      sizes={autoSizes}
      loading={loading}
      fetchpriority={fetchpriority}
      alt={item.alt}
      class="reveal-img block w-full"
      style="opacity:0;transition:opacity .4s ease"
      pictureAttributes={{
        style: `background-image:url(${placeholder});background-size:cover`,
      }}
    />
  )
}
```

- [ ] **Step 2: Verify it type-checks**

Run:

```bash
pnpm exec astro check
```

Expected: `0 errors`. (The component type-checks standalone even before any route uses it.)

- [ ] **Step 3: Commit**

```bash
git add src/components/DemoImage.astro
git commit -m "feat(images): add strategy-switched DemoImage component"
```

---

### Task 6: Routes (hub, list, detail)

The three pages. `strategy ∈ { naive, manual, auto, pixel-perfect, lqip }`. The hub explains and links the five strategies; the list renders the responsive grid of all 20 (exercising multi-column `sizes`); the detail renders one large `cover` image as the LCP element. All static.

**Files:**
- Create: `src/pages/images/index.astro` (hub)
- Create: `src/pages/images/[strategy]/index.astro` (list)
- Create: `src/pages/images/[strategy]/[id].astro` (detail)

**Interfaces:**
- Consumes: `gallery` (Task 1), `DemoImage` (Task 5), `reveal-img.ts` (Task 4), `Layout.astro` (existing, props `{ title, description }`), the source images in `src/assets/demo/` (Task 2).
- Produces: routes `/images`, `/images/<strategy>`, `/images/<strategy>/<id>`.

- [ ] **Step 1: Write the hub page**

Create `src/pages/images/index.astro`:

```astro
---
import Layout from "../../layouts/Layout.astro";

const strategies = [
  { id: "naive", title: "Naive", blurb: "Plain <img>, full-size, no srcset/sizes/dimensions. The measurement floor." },
  { id: "manual", title: "Manual", blurb: "Hand-cut widths + srcset/sizes + baked blur over public/ files. The bash era, done right." },
  { id: "auto", title: "Auto", blurb: "<Picture> generates formats, srcset, sizes, and width/height. Toil deleted." },
  { id: "pixel-perfect", title: "Pixel-perfect", blurb: "sizes computed from layout tokens so the served file lands on the slot." },
  { id: "lqip", title: "LQIP", blurb: "Auto plus a getImage() blurred placeholder and a cache-guarded fade-in." },
];
---

<Layout title="Images — Astro Playground" description="Five image-optimization strategies, measured.">
  <main class="mx-auto max-w-3xl space-y-10 px-6 py-16">
    <section class="space-y-2">
      <h1 class="text-2xl font-semibold">Image optimization strategies</h1>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        One route per technique, from unoptimized to fully optimized. Each renders
        the same 20-image dataset as a responsive grid; each grid item links to a
        large detail view (the LCP element). Run the Lighthouse harness against
        <code>pnpm preview</code> to compare LCP, CLS, and bytes.
      </p>
    </section>

    <nav>
      <ul class="space-y-3">
        {strategies.map((s) => (
          <li>
            <a
              href={`/images/${s.id}`}
              class="block rounded-lg border border-zinc-200 px-5 py-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <span class="font-medium">{s.title}</span>
              <span class="ml-2 text-sm text-zinc-600 dark:text-zinc-400">{s.blurb}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  </main>
</Layout>
```

- [ ] **Step 2: Write the list page**

Create `src/pages/images/[strategy]/index.astro`:

```astro
---
import type { ImageMetadata } from "astro";
import Layout from "../../../layouts/Layout.astro";
import DemoImage from "../../../components/DemoImage.astro";
import { gallery } from "../../../data/gallery";

const STRATEGIES = ["naive", "manual", "auto", "pixel-perfect", "lqip"] as const;
type Strategy = (typeof STRATEGIES)[number];

export function getStaticPaths() {
  return STRATEGIES.map((strategy) => ({ params: { strategy } }));
}

const strategy = Astro.params.strategy as Strategy;

const images = import.meta.glob<{ default: ImageMetadata }>(
  "/src/assets/demo/*.jpg",
  { eager: true },
);
const imgOf = (id: string) => images[`/src/assets/demo/${id}.jpg`]?.default;
---

<Layout title={`Images / ${strategy} — Astro Playground`} description={`The ${strategy} strategy across the 20-image dataset.`}>
  <main class="mx-auto max-w-3xl space-y-8 px-6 py-16">
    <header class="space-y-2">
      <a href="/images" class="text-sm text-zinc-600 hover:underline dark:text-zinc-400">&larr; All strategies</a>
      <h1 class="text-2xl font-semibold capitalize">{strategy}</h1>
    </header>

    <ul class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {gallery.map((item) => (
        <li class="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <a href={`/images/${strategy}/${item.id}`} class="block">
            <DemoImage item={item} strategy={strategy} type="thumb" image={imgOf(item.id)} />
          </a>
        </li>
      ))}
    </ul>
  </main>
  <script>
    import "../../../scripts/reveal-img.ts";
  </script>
</Layout>
```

- [ ] **Step 3: Write the detail page**

Create `src/pages/images/[strategy]/[id].astro`:

```astro
---
import type { ImageMetadata } from "astro";
import Layout from "../../../layouts/Layout.astro";
import DemoImage from "../../../components/DemoImage.astro";
import { gallery, type GalleryItem } from "../../../data/gallery";

const STRATEGIES = ["naive", "manual", "auto", "pixel-perfect", "lqip"] as const;
type Strategy = (typeof STRATEGIES)[number];

export function getStaticPaths() {
  return STRATEGIES.flatMap((strategy) =>
    gallery.map((item) => ({ params: { strategy, id: item.id }, props: { item } })),
  );
}

const strategy = Astro.params.strategy as Strategy;
const { item } = Astro.props as { item: GalleryItem };

const images = import.meta.glob<{ default: ImageMetadata }>(
  "/src/assets/demo/*.jpg",
  { eager: true },
);
const image = images[`/src/assets/demo/${item.id}.jpg`]?.default;
---

<Layout title={`${item.caption} / ${strategy} — Astro Playground`} description={item.alt}>
  <main class="mx-auto max-w-3xl space-y-6 px-6 py-16">
    <header class="space-y-2">
      <a href={`/images/${strategy}`} class="text-sm text-zinc-600 hover:underline dark:text-zinc-400">&larr; {strategy} grid</a>
      <h1 class="text-2xl font-semibold">{item.caption}</h1>
    </header>

    <figure class="space-y-2">
      <div class="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <DemoImage item={item} strategy={strategy} type="cover" image={image} />
      </div>
      <figcaption class="text-sm text-zinc-600 dark:text-zinc-400">
        {item.kind} · {item.source} · strategy: {strategy}
      </figcaption>
    </figure>
  </main>
  <script>
    import "../../../scripts/reveal-img.ts";
  </script>
</Layout>
```

- [ ] **Step 4: Type-check and build**

The generator must have run (Task 2) so all 20 sources exist. Run:

```bash
pnpm gen:images && pnpm exec astro check && pnpm exec astro build
```

Expected: `astro check` reports `0 errors`; the build completes; build log shows optimized images written. Verify the output:

```bash
ls dist/images/auto/index.html dist/images/auto/photo-01/index.html
ls dist/_astro/*.webp | head -1
ls dist/manual/photo-01-640.jpg
```

Expected: the list page HTML, a detail page HTML, at least one generated `.webp` in `/_astro/`, and the manual width file copied from `public/manual/` into `dist/manual/`.

- [ ] **Step 5: Smoke-test the served routes**

Start preview in the background, then probe:

```bash
pnpm preview &
PREVIEW_PID=$!
sleep 3
curl -s http://localhost:4321/images | grep -c "Pixel-perfect"
curl -s http://localhost:4321/images/auto | grep -c "<picture"
curl -s http://localhost:4321/images/naive | grep -c "srcset"
curl -s http://localhost:4321/images/lqip/photo-01 | grep -c "reveal-img"
kill $PREVIEW_PID
```

Expected: hub contains "Pixel-perfect" (≥1); `auto` list contains `<picture` elements (≥1); `naive` contains zero `srcset` (the floor — `0`); `lqip` detail contains the `reveal-img` class (≥1).

- [ ] **Step 6: Commit**

```bash
git add src/pages/images/
git commit -m "feat(images): add hub, list, and detail routes"
```

---

### Task 7: Lighthouse measurement harness

Light, no Python. Runs Lighthouse 13 against `pnpm preview` (a real production build = Sharp build-time output), takes a 3-run median per strategy, and prints LCP / CLS / total-byte-weight side by side across all five strategies.

**Files:**
- Create: `scripts/lighthouse.mjs` (runs Lighthouse 3× for one strategy)
- Create: `scripts/measure.mjs` (reads JSON, medians, prints table)
- Create: `scripts/benchmark.mjs` (orchestrates all five, then prints the table)
- Modify: `package.json` (add `lighthouse:*` and `benchmark:images` scripts)
- Create: `scripts/lh/.gitkeep`
- Modify: `.gitignore` (ignore the Lighthouse JSON output)

**Interfaces:**
- Consumes: a running `pnpm preview` at `http://localhost:4321`.
- Produces: per-strategy JSON at `scripts/lh/<strategy>-<run>.json`; a printed median table. `measure.mjs` exports `printTable()` consumed by `benchmark.mjs`.

- [ ] **Step 1: Write the per-strategy Lighthouse runner**

Create `scripts/lighthouse.mjs`:

```js
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(root, "scripts/lh");
const RUNS = 3; // 3-run median tames single-run noise; bump to 5 if still jumpy

export function runLighthouse(strategy) {
  mkdirSync(OUT_DIR, { recursive: true });
  const url = `http://localhost:4321/images/${strategy}`;
  for (let run = 1; run <= RUNS; run++) {
    const out = join(OUT_DIR, `${strategy}-${run}.json`);
    console.log(`lighthouse ${strategy} run ${run}/${RUNS} -> ${url}`);
    const res = spawnSync(
      "pnpm",
      [
        "dlx",
        "lighthouse@13",
        url,
        "--preset=desktop",
        "--only-categories=performance",
        "--output=json",
        `--output-path=${out}`,
        '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
        "--quiet",
      ],
      { stdio: "inherit", cwd: root },
    );
    if (res.status !== 0) {
      throw new Error(`lighthouse failed for ${strategy} run ${run}`);
    }
  }
}

// allow `node scripts/lighthouse.mjs <strategy>`
const arg = process.argv[2];
if (arg) runLighthouse(arg);
```

- [ ] **Step 2: Write the median table reporter**

Create `scripts/measure.mjs`:

```js
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(root, "scripts/lh");

const STRATEGIES = ["naive", "manual", "auto", "pixel-perfect", "lqip"];

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function metricsFor(strategy) {
  if (!existsSync(OUT_DIR)) return null;
  const files = readdirSync(OUT_DIR).filter(
    (f) => f.startsWith(`${strategy}-`) && f.endsWith(".json"),
  );
  if (files.length === 0) return null;
  const lcp = [];
  const cls = [];
  const bytes = [];
  for (const f of files) {
    const j = JSON.parse(readFileSync(join(OUT_DIR, f), "utf8"));
    const a = j.audits;
    lcp.push(a["largest-contentful-paint"].numericValue);
    cls.push(a["cumulative-layout-shift"].numericValue);
    bytes.push(a["total-byte-weight"].numericValue);
  }
  return {
    runs: files.length,
    lcp: median(lcp),
    cls: median(cls),
    bytes: median(bytes),
  };
}

export function printTable() {
  const rows = STRATEGIES.map((s) => ({ s, m: metricsFor(s) }));
  console.log("\nStrategy        Runs   LCP (ms)   CLS      Bytes (KB)");
  console.log("------------------------------------------------------");
  for (const { s, m } of rows) {
    if (!m) {
      console.log(`${s.padEnd(15)} (no data — run pnpm lighthouse:${s})`);
      continue;
    }
    console.log(
      `${s.padEnd(15)} ${String(m.runs).padEnd(6)} ${Math.round(m.lcp)
        .toString()
        .padEnd(10)} ${m.cls.toFixed(3).padEnd(8)} ${Math.round(m.bytes / 1024)}`,
    );
  }
  console.log("");
}

// allow `node scripts/measure.mjs`
printTable();
```

- [ ] **Step 3: Write the orchestrator**

Create `scripts/benchmark.mjs`:

```js
import { runLighthouse } from "./lighthouse.mjs";
import { printTable } from "./measure.mjs";

// Assumes `pnpm preview` is already running at http://localhost:4321.
const STRATEGIES = ["naive", "manual", "auto", "pixel-perfect", "lqip"];

for (const s of STRATEGIES) {
  runLighthouse(s);
}
printTable();
```

Note: `measure.mjs` calls `printTable()` at import time, so `benchmark.mjs` will print the table once on import and once explicitly. That double-print is harmless; if it bothers you, guard the bottom call in `measure.mjs` with `if (process.argv[1].endsWith("measure.mjs")) printTable();`.

- [ ] **Step 4: Wire scripts + ignore output**

Add to `package.json` `scripts` (after `preview`):

```json
    "lighthouse:naive": "node scripts/lighthouse.mjs naive",
    "lighthouse:manual": "node scripts/lighthouse.mjs manual",
    "lighthouse:auto": "node scripts/lighthouse.mjs auto",
    "lighthouse:pixel-perfect": "node scripts/lighthouse.mjs pixel-perfect",
    "lighthouse:lqip": "node scripts/lighthouse.mjs lqip",
    "benchmark:images": "node scripts/benchmark.mjs",
```

Create `scripts/lh/.gitkeep` (empty file). Append to `.gitignore`:

```
# Lighthouse run output (keep the dir, ignore the JSON)
scripts/lh/*.json
```

- [ ] **Step 5: Verify the reporter handles missing data gracefully**

Run (before any Lighthouse run exists):

```bash
node scripts/measure.mjs
```

Expected: prints the table header and five `(no data — run pnpm lighthouse:<s>)` rows without crashing.

- [ ] **Step 6: Verify one real Lighthouse run end-to-end (requires Chrome)**

This step needs a Chrome/Chromium available to Lighthouse. If Chrome is unavailable in the environment, skip the run and note it; the scripts are still verified by Step 5. Otherwise:

```bash
pnpm build
pnpm preview &
PREVIEW_PID=$!
sleep 3
pnpm lighthouse:naive
pnpm lighthouse:auto
node scripts/measure.mjs
kill $PREVIEW_PID
```

Expected: `scripts/lh/naive-{1,2,3}.json` and `auto-{1,2,3}.json` written; the table prints real numbers with `naive` showing higher `Bytes (KB)` and worse `CLS` than `auto`.

- [ ] **Step 7: Commit**

```bash
git add scripts/lighthouse.mjs scripts/measure.mjs scripts/benchmark.mjs scripts/lh/.gitkeep package.json .gitignore
git commit -m "feat(images): add Lighthouse measurement harness"
```

---

### Task 8: Docs and hub link

Wires the example into the playground's discoverable surfaces and documents how to generate the dataset, run the routes, and run the benchmark — including the Sharp-vs-Netlify two-host note (identical `/_astro/` files, different transform timing).

**Files:**
- Modify: `src/pages/index.astro` (add the images example to the hub)
- Modify: `README.md` (new "Images" section)
- Modify: `CLAUDE.md` (architecture paragraph)

**Interfaces:**
- Consumes: the `/images` routes (Task 6), the `gen:images`/`benchmark:images` scripts (Tasks 2, 7).
- Produces: documentation only.

- [ ] **Step 1: Add the example to the playground hub**

In `src/pages/index.astro`, extend the `examples` array (keep the existing residents entry):

```ts
const examples = [
  {
    href: "/residents",
    title: "Heroes Retirement Home",
    description: "API endpoints & Astro Actions",
  },
  {
    href: "/images",
    title: "Image Optimization Strategies",
    description: "naive → manual → auto → pixel-perfect → LQIP, measured",
  },
];
```

- [ ] **Step 2: Add the README "Images" section**

Append to `README.md` (after the existing `## Examples` content):

```markdown
- **[/images](./src/pages/images/index.astro)** — five image-optimization
  strategies from the Web Performance series (Part 4), each measurable:
  - `naive` — plain `<img>`, full-size, no `srcset`/`sizes`/dimensions (the floor)
  - `manual` — hand-cut widths + `srcset`/`sizes` + baked blur over `public/manual/`
  - `auto` — `<Picture>` generates formats, `srcset`, `sizes`, and `width`/`height`
  - `pixel-perfect` — `sizes` computed from layout tokens (`src/lib/sizes.ts`)
  - `lqip` — `auto` plus a `getImage()` blurred placeholder and a cache-guarded fade

### Dataset

`pnpm gen:images` builds a deterministic 20-image dataset into
`src/assets/demo/` (sources) and `public/manual/` (hand-cut widths + blur).
Half the photos are seeded [Picsum](https://picsum.photos) images (committed);
the other half are generated offline with `sharp` (`feTurbulence`, fixed seed)
and are git-ignored — reproduced on demand. `pnpm build` runs `gen:images` first.

### Benchmark

Run against a production build (Sharp build-time output):

```sh
pnpm build
pnpm preview          # http://localhost:4321
pnpm benchmark:images # 3-run median LCP / CLS / bytes across all five strategies
```

**Sharp vs. Netlify Image CDN.** Run the same benchmark twice — once against
local `pnpm preview` (Sharp transforms images at build time) and once against the
deployed Netlify URL (Image CDN transforms at request time). The `/_astro/` files
are identical; only the transform timing differs. That is the blog's
Sharp-vs-Netlify point made concrete — same routes, two hosts, no extra code.
```

- [ ] **Step 3: Add the CLAUDE.md architecture paragraph**

Append to `CLAUDE.md` (under the architecture/examples discussion):

```markdown
## Images example

`/images` demonstrates five image-optimization strategies (`naive`, `manual`,
`auto`, `pixel-perfect`, `lqip`) over a deterministic 20-image dataset.

- **Single source of truth:** `src/data/gallery.json` (typed by `src/data/gallery.ts`).
  Both the generator and the routes read it, so the dataset never drifts.
- **Generator:** `scripts/gen-images.mjs` (`pnpm gen:images`, runs before `build`)
  uses `sharp` to produce sources in `src/assets/demo/` and hand-cut widths + blur
  in `public/manual/`. Picsum sources are committed; generated sources and all
  `public/manual/` files are git-ignored and reproduced on demand.
- **Rendering:** `src/components/DemoImage.astro` switches on `strategy`. `sizes`
  strings come from `src/lib/sizes.ts`; the LQIP fade is `src/scripts/reveal-img.ts`.
- **Config:** `astro.config.mjs` sets `image.responsiveStyles: true` (required for
  the `<Picture>` routes to be responsive). Tailwind 4 utilities live in a cascade
  layer and lose to Astro's unlayered responsive styles, so override `object-fit`/
  `object-position` via the component's `fit`/`position` props, not Tailwind classes.
- **Measurement:** `pnpm benchmark:images` runs Lighthouse 13 (3-run median) against
  `pnpm preview` and prints LCP / CLS / bytes across all five strategies.
- **Pinned to Astro 6.4.8** — do not upgrade to 7.x (see the design spec's Versions note).
```

- [ ] **Step 4: Verify everything still builds and the hub links the example**

Run:

```bash
pnpm gen:images && pnpm exec astro check && pnpm exec astro build
pnpm preview &
PREVIEW_PID=$!
sleep 3
curl -s http://localhost:4321/ | grep -c "/images"
kill $PREVIEW_PID
```

Expected: `astro check` reports `0 errors`; build succeeds; the homepage contains a link to `/images` (≥1).

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro README.md CLAUDE.md
git commit -m "docs(images): document the images example and link it from the hub"
```

---

## Self-Review Notes

- **Spec coverage** — every blog-point-coverage row maps to a task: bash-era manual (Task 6 `manual` + Task 2 `public/manual/`), `<Picture>` toil deletion (Task 5/6 `auto`), static `/_astro/` (Task 6 build verify), Sharp-vs-Netlify (Task 8 README note), `responsiveStyles` + Tailwind caveat (Task 2 config + Task 8 CLAUDE.md note), LQIP (Task 4/5 `lqip`), `sizes` from tokens (Task 3 + Task 6 `pixel-perfect`), photo-vs-art content split (Task 1 dataset + rendered across `auto`/`pixel-perfect`), eager hero vs lazy thumbs (Task 5 `type="cover"`), unoptimized baseline (Task 6 `naive`), dataset (Tasks 1–2), measurement (Task 7), docs (Task 8), versions (Global Constraints).
- **Open question deferred to implementation:** the spec's optional `Lqip.astro` split is intentionally NOT a task — `DemoImage.astro` keeps the LQIP branch inline ("default is inline until it earns a split"). Split it during execution only if the component grows unwieldy.
- **Verification adapted** to the project's no-test-framework reality (Global Constraints): generator output assertions, `astro check`, `pnpm build` artifact checks, and `pnpm preview` + `curl` smoke tests stand in for a unit-test cycle.
