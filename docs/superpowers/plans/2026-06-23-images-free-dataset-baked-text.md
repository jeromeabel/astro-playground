# Images — Free Dataset + Baked Text + Benchmark Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch the `/images` example to a 20-image **free (Picsum-only)** dataset with **pixel-dimension text baked into the images**, surface **benchmark results on the hub**, and document the **cache/measurement** caveat — keeping the example in sync with Web Performance Part 4.

**Architecture:** `gen-images.mjs` drops the procedural-image path and always fetches Picsum; `sharp` bakes a hard-edged `W×H px` label into art sources and into every hand-cut `manual` width file. `measure.mjs` writes medians to a committed `src/data/benchmark.json` that the hub renders as a table. The original generator is preserved verbatim under `scripts/backup/`.

**Tech Stack:** Astro 6.4.8, `astro:assets` (`<Picture>`, `getImage`), Tailwind CSS v4, `sharp`, Lighthouse 13, Node `fs`/`fetch`.

## Global Constraints

- **Astro pinned to `^6.4.8`.** Do NOT upgrade to 7.x.
- **Package manager is `pnpm`.** No `npm`/`yarn`.
- **No test framework.** Verification by `pnpm gen:images`, `astro check`, `pnpm build`, artifact inspection, and `curl` smoke tests.
- **Imports are relative.** No path aliases.
- **Routes are static.** No `export const prerender = false` on any images route.
- **`responsiveStyles: true` stays in `astro.config.mjs`.**
- **Source dimensions:** `SRC_W=2400`, `SRC_H=1600` (3:2). Manual widths `[640, 960, 1280, 1920]`; their 3:2 heights are `427, 640, 853, 1280`.
- **Dataset is all free:** every `gallery.json` entry is `source: "picsum"`. No procedurally generated sources.
- **Label copy format:** baked labels read exactly `<W>×<H> px` (e.g. `640×427 px`), using the multiplication sign `×` (U+00D7).

---

### Task 1: Free-only dataset manifest + type

Make every dataset entry free (Picsum) and fix the captions/alt that still describe procedurally generated images. Tighten the `GalleryItem` type so `source` can only be `"picsum"`.

**Files:**
- Modify: `src/data/gallery.json`
- Modify: `src/data/gallery.ts`

**Interfaces:**
- Produces: `interface GalleryItem { id: string; kind: "photo" | "art"; source: "picsum"; alt: string; caption: string }` and `export const gallery: GalleryItem[]` (20 entries). Consumed by `gen-images.mjs`, `DemoImage.astro`, and all `/images` routes (unchanged consumers).

- [ ] **Step 1: Replace the manifest with an all-Picsum dataset**

Overwrite `src/data/gallery.json` with:

```json
[
  { "id": "photo-01", "kind": "photo", "source": "picsum", "alt": "Landscape photograph, sample 01", "caption": "Coastline at dawn" },
  { "id": "photo-02", "kind": "photo", "source": "picsum", "alt": "Landscape photograph, sample 02", "caption": "Pine ridge in fog" },
  { "id": "photo-03", "kind": "photo", "source": "picsum", "alt": "Landscape photograph, sample 03", "caption": "River bend at noon" },
  { "id": "photo-04", "kind": "photo", "source": "picsum", "alt": "Landscape photograph, sample 04", "caption": "Desert dunes" },
  { "id": "photo-05", "kind": "photo", "source": "picsum", "alt": "Landscape photograph, sample 05", "caption": "City skyline dusk" },
  { "id": "photo-06", "kind": "photo", "source": "picsum", "alt": "Landscape photograph, sample 06", "caption": "Forest canopy" },
  { "id": "photo-07", "kind": "photo", "source": "picsum", "alt": "Landscape photograph, sample 07", "caption": "Snow on basalt" },
  { "id": "photo-08", "kind": "photo", "source": "picsum", "alt": "Landscape photograph, sample 08", "caption": "Harbor at night" },
  { "id": "photo-09", "kind": "photo", "source": "picsum", "alt": "Landscape photograph, sample 09", "caption": "Wheat field, wind" },
  { "id": "photo-10", "kind": "photo", "source": "picsum", "alt": "Landscape photograph, sample 10", "caption": "Cliff path, morning" },
  { "id": "art-01", "kind": "art", "source": "picsum", "alt": "Photograph with a hard-edged baked text label, sample 01", "caption": "SHARP EDGES 01" },
  { "id": "art-02", "kind": "art", "source": "picsum", "alt": "Photograph with a hard-edged baked text label, sample 02", "caption": "SHARP EDGES 02" },
  { "id": "art-03", "kind": "art", "source": "picsum", "alt": "Photograph with a hard-edged baked text label, sample 03", "caption": "SHARP EDGES 03" },
  { "id": "art-04", "kind": "art", "source": "picsum", "alt": "Photograph with a hard-edged baked text label, sample 04", "caption": "SHARP EDGES 04" },
  { "id": "art-05", "kind": "art", "source": "picsum", "alt": "Photograph with a hard-edged baked text label, sample 05", "caption": "SHARP EDGES 05" },
  { "id": "art-06", "kind": "art", "source": "picsum", "alt": "Photograph with a hard-edged baked text label, sample 06", "caption": "SHARP EDGES 06" },
  { "id": "art-07", "kind": "art", "source": "picsum", "alt": "Photograph with a hard-edged baked text label, sample 07", "caption": "SHARP EDGES 07" },
  { "id": "art-08", "kind": "art", "source": "picsum", "alt": "Photograph with a hard-edged baked text label, sample 08", "caption": "SHARP EDGES 08" },
  { "id": "art-09", "kind": "art", "source": "picsum", "alt": "Photograph with a hard-edged baked text label, sample 09", "caption": "SHARP EDGES 09" },
  { "id": "art-10", "kind": "art", "source": "picsum", "alt": "Photograph with a hard-edged baked text label, sample 10", "caption": "SHARP EDGES 10" }
]
```

- [ ] **Step 2: Narrow the `source` type in `gallery.ts`**

In `src/data/gallery.ts`, change the `source` field and its comment:

```ts
export interface GalleryItem {
  id: string; // "photo-01" | "art-01" ...
  kind: "photo" | "art"; // "art" => baked hard-edged text label
  source: "picsum"; // all sources are free Picsum images
  alt: string;
  caption: string; // also the baked label text for kind "art"
}
```

- [ ] **Step 3: Verify the manifest shape**

```bash
node -e "const g=require('./src/data/gallery.json');const bad=g.filter(i=>i.source!=='picsum');console.log(g.length, 'picsum-only:', bad.length===0, 'ids:', new Set(g.map(i=>i.id)).size)"
```

Expected: `20 picsum-only: true ids: 20`.

- [ ] **Step 4: Commit**

```bash
git add src/data/gallery.json src/data/gallery.ts
git commit -m "feat(images): make dataset all-free (Picsum-only)"
```

---

### Task 2: Generator — back up, rewrite free-only with baked `W×H px`, regenerate

Preserve the current generator, then rewrite it to fetch only Picsum and bake pixel-dimension labels: a hard-edged caption + `W×H px` onto art sources, and a per-file `W×H px` badge into every `manual` width file. Delete stale on-disk sources (the procedural ones and the old-overlay art ones) so the new labels actually take, regenerate all 20, un-ignore the sources, and commit them.

**Files:**
- Create: `scripts/backup/gen-images-generated.mjs` (verbatim copy of the current generator)
- Create: `scripts/backup/README.md`
- Modify: `scripts/gen-images.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `src/data/gallery.json` (Task 1).
- Produces: 20 labeled sources in `src/assets/demo/<id>.jpg`; per-id labeled widths `public/manual/<id>-{640,960,1280,1920}.jpg` and `<id>-blur.jpg`. Consumed by the routes and the `manual` strategy.

- [ ] **Step 1: Back up the current generator verbatim (before any edit)**

```bash
mkdir -p scripts/backup
cp scripts/gen-images.mjs scripts/backup/gen-images-generated.mjs
```

- [ ] **Step 2: Write the backup README**

Create `scripts/backup/README.md`:

```markdown
# Backup — procedural-image generator

`gen-images-generated.mjs` is the pre-2026-06-23 generator. It produced half the
dataset procedurally (`sharp` + `feTurbulence` plasma, fixed seed) instead of
from Picsum. The current dataset is all-free (Picsum only); this is kept "in
case." It is deterministic (fixed seed → byte-identical output), so the script
*is* the backup of those images — no binaries are stored here.

To regenerate the old mixed dataset: restore the `source: "generated"` entries
in `src/data/gallery.json`, then run `node scripts/backup/gen-images-generated.mjs`.
```

- [ ] **Step 3: Rewrite `scripts/gen-images.mjs` (free-only + baked labels)**

Overwrite `scripts/gen-images.mjs` with:

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
```

- [ ] **Step 4: Un-ignore the generated sources in `.gitignore`**

In `.gitignore`, delete these 10 lines (the block under the images comment, keeping the `public/manual/` line):

```
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

The result keeps the comment and `public/manual/`:

```
# images example — generated artifacts (reproduced by `pnpm gen:images`)
public/manual/
```

- [ ] **Step 5: Clear stale on-disk images so new labels take, then regenerate**

The committed art sources carry the old caption-only overlay and `photo-06..10`/`art-06..10` are old procedural images; delete all sources and manual files so the rewritten generator rebuilds them with the `W×H px` labels. Requires network for the Picsum fetch.

```bash
rm -f src/assets/demo/*.jpg public/manual/*.jpg
pnpm gen:images
```

Expected: 20 `✓ <id>` lines, then the summary. Verify counts and dimensions:

```bash
ls src/assets/demo/*.jpg | wc -l        # 20
ls public/manual/*.jpg | wc -l          # 100  (20 × 5)
node -e "require('sharp')('public/manual/photo-01-640.jpg').metadata().then(m=>console.log(m.width+'x'+m.height))"  # 640x427
```

- [ ] **Step 6: Type-check and build**

```bash
pnpm exec astro check && pnpm exec astro build
```

Expected: `astro check` reports `0 errors`; build completes.

- [ ] **Step 7: Commit (all 20 sources now tracked)**

```bash
git add scripts/gen-images.mjs scripts/backup/ .gitignore
git add src/assets/demo/
git status --short
git commit -m "feat(images): free-only generator with baked W×H px labels; back up procedural generator"
```

Expected: `git status --short` shows the 20 `src/assets/demo/*.jpg` staged (10 newly tracked) and `public/manual/` still ignored.

---

### Task 3: Export benchmark medians to `src/data/benchmark.json`

Teach `measure.mjs` to write the median table to a committed JSON the hub can import, and have `benchmark.mjs` call it after printing. Commit a valid empty-shape file so the build never depends on a Lighthouse run.

**Files:**
- Modify: `scripts/measure.mjs`
- Modify: `scripts/benchmark.mjs`
- Create: `src/data/benchmark.json`

**Interfaces:**
- Produces: `export function writeResults(): void` in `measure.mjs`, writing `src/data/benchmark.json` shaped `{ generatedAt: string | null, rows: Array<{ strategy: string, runs: number, lcpMs: number, cls: number, bytes: number }> }`. Consumed by `benchmark.mjs` (Task 3) and the hub (Task 4).

- [ ] **Step 1: Add `writeResults()` to `measure.mjs`**

In `scripts/measure.mjs`, add `writeFileSync` to the `node:fs` import:

```js
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
```

Then, immediately above the `// allow \`node scripts/measure.mjs\`` comment near the bottom, insert:

```js
const DATA_FILE = join(root, "src/data/benchmark.json");

// Emit the medians to a committed JSON the /images hub renders as a table.
export function writeResults() {
  const rows = STRATEGIES.map((s) => {
    const m = metricsFor(s);
    if (!m) return null;
    return {
      strategy: s,
      runs: m.runs,
      lcpMs: Math.round(m.lcp),
      cls: Number(m.cls.toFixed(3)),
      bytes: Math.round(m.bytes),
    };
  }).filter(Boolean);
  const out = { generatedAt: new Date().toISOString(), rows };
  writeFileSync(DATA_FILE, JSON.stringify(out, null, 2) + "\n");
  console.log(`wrote ${rows.length} rows -> src/data/benchmark.json`);
}
```

- [ ] **Step 2: Call `writeResults()` from `benchmark.mjs`**

Overwrite `scripts/benchmark.mjs` with:

```js
import { runLighthouse } from "./lighthouse.mjs";
import { printTable, writeResults } from "./measure.mjs";

// Assumes `pnpm preview` is already running at http://localhost:4321.
const STRATEGIES = ["naive", "manual", "auto", "pixel-perfect", "lqip"];

for (const s of STRATEGIES) {
  runLighthouse(s);
}
printTable();
writeResults();
```

- [ ] **Step 3: Commit a valid empty-shape `benchmark.json`**

Create `src/data/benchmark.json` (so the hub build never breaks before a run):

```json
{
  "generatedAt": null,
  "rows": []
}
```

- [ ] **Step 4: Verify `writeResults()` runs and overwrites the empty shape correctly**

`measure.mjs` over the existing committed `scripts/lh/*.json` (the repo already has `naive-*` and `auto-*` runs) should write real rows:

```bash
node -e "import('./scripts/measure.mjs').then(m=>m.writeResults())"
node -e "const b=require('./src/data/benchmark.json');console.log('rows:', b.rows.length, b.rows.map(r=>r.strategy).join(','))"
```

Expected: `wrote N rows -> src/data/benchmark.json`, then a `rows:` line listing at least `naive,auto` (whichever strategies have JSON present). Then restore the committed empty shape so the snapshot is reproducible-on-demand, not stale:

```bash
git checkout src/data/benchmark.json
```

- [ ] **Step 5: Commit**

```bash
git add scripts/measure.mjs scripts/benchmark.mjs src/data/benchmark.json
git commit -m "feat(images): export benchmark medians to src/data/benchmark.json"
```

---

### Task 4: Render the benchmark table on the `/images` hub

Import `benchmark.json` on the hub and render a results table below the strategy list, with a graceful empty state and a cold-cache caption.

**Files:**
- Modify: `src/pages/images/index.astro`

**Interfaces:**
- Consumes: `src/data/benchmark.json` (Task 3) — `{ generatedAt, rows[] }`.
- Produces: rendered HTML only.

- [ ] **Step 1: Import the benchmark data**

In `src/pages/images/index.astro`, add after the `import Layout` line:

```ts
import benchmark from "../../data/benchmark.json";

const rows = benchmark.rows ?? [];
const hasData = rows.length > 0;
```

- [ ] **Step 2: Add the results section before `</main>`**

Insert this block immediately before the closing `</main>` tag:

```astro
    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Measured results</h2>
      {hasData ? (
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-zinc-200 text-left dark:border-zinc-800">
              <th class="py-2 pr-4 font-medium">Strategy</th>
              <th class="py-2 pr-4 font-medium">LCP (ms)</th>
              <th class="py-2 pr-4 font-medium">CLS</th>
              <th class="py-2 font-medium">Bytes (KB)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr class="border-b border-zinc-100 dark:border-zinc-900">
                <td class="py-2 pr-4 font-mono">{r.strategy}</td>
                <td class="py-2 pr-4 tabular-nums">{r.lcpMs}</td>
                <td class="py-2 pr-4 tabular-nums">{r.cls.toFixed(3)}</td>
                <td class="py-2 tabular-nums">{Math.round(r.bytes / 1024)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p class="text-sm text-zinc-600 dark:text-zinc-400">
          No measurements yet — run <code>pnpm benchmark:images</code> against
          <code>pnpm preview</code> to populate this table.
        </p>
      )}
      <p class="text-xs text-zinc-500 dark:text-zinc-500">
        Cold-cache Lighthouse 13 medians (3 runs each). A warm browser reload is
        faster and is not a fair strategy comparison — see the README.
      </p>
    </section>
```

- [ ] **Step 3: Type-check and build**

```bash
pnpm exec astro check && pnpm exec astro build
```

Expected: `0 errors`; build completes. (With the committed empty-shape JSON, the empty-state branch renders.)

- [ ] **Step 4: Smoke-test the hub (empty state)**

```bash
pnpm preview &
PREVIEW_PID=$!
sleep 3
curl -s http://localhost:4321/images | grep -c "Measured results"
curl -s http://localhost:4321/images | grep -c "No measurements yet"
kill $PREVIEW_PID
```

Expected: `Measured results` ≥ 1; `No measurements yet` = 1 (empty-shape JSON committed).

- [ ] **Step 5: Commit**

```bash
git add src/pages/images/index.astro
git commit -m "feat(images): render benchmark results table on the hub"
```

---

### Task 5: Cache + measurement docs

Document the three measurement scripts, the cold-vs-warm cache caveat, and the on-page table in `README.md` and `CLAUDE.md`.

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

**Interfaces:** Documentation only.

- [ ] **Step 1: Update the README Benchmark section**

In `README.md`, find the `### Benchmark` heading and replace its body (down to, but not including, the next `##`/`###` heading or end of file) with:

```markdown
### Benchmark

Run against a production build (Sharp build-time output):

```sh
pnpm build
pnpm preview          # http://localhost:4321
pnpm benchmark:images # 3-run median LCP / CLS / bytes across all five strategies
```

`benchmark:images` orchestrates `scripts/lighthouse.mjs` (3 Lighthouse runs per
strategy) and `scripts/measure.mjs` (per-metric median). It prints a table **and**
writes `src/data/benchmark.json`, which the `/images` hub renders as a results
table. Commit a refreshed `benchmark.json` to update the on-page numbers.

**Cache caveat.** Lighthouse runs cold by default, so its LCP/bytes are
first-visit numbers. A manual browser reload is *warm* (disk/memory cache) — which
is why the next load feels faster — but a warm reload is not a fair comparison
between strategies. Use `pnpm benchmark:images` for the cold, repeatable measure;
to feel warm behavior, reload in the browser with DevTools → Network open.

**Sharp vs. Netlify Image CDN.** Run the same benchmark twice — once against
local `pnpm preview` (Sharp transforms at build time) and once against the
deployed Netlify URL (Image CDN transforms per request). The `/_astro/` files are
identical; only the transform timing differs.
```

(If the existing `### Benchmark` already contains the Sharp-vs-Netlify paragraph, keep a single copy — do not duplicate it.)

- [ ] **Step 2: Update the CLAUDE.md Measurement bullet**

In `CLAUDE.md`, under `## Images example`, replace the `- **Measurement:**` bullet with:

```markdown
- **Measurement:** `pnpm benchmark:images` runs Lighthouse 13 (3-run median) against
  `pnpm preview`, prints LCP / CLS / bytes across the five strategies, and writes
  `src/data/benchmark.json` (rendered as a table on the `/images` hub). Lighthouse
  is cold-cache; a warm browser reload is faster but not a fair comparison.
- **Dataset is all free:** every `gallery.json` entry is `source: "picsum"`. `sharp`
  bakes a hard-edged `W×H px` label onto `art` sources and into each `public/manual/`
  width file (the served file shows its own size). The pre-2026-06-23 procedural
  generator is kept at `scripts/backup/gen-images-generated.mjs`.
```

- [ ] **Step 3: Verify the docs build context still passes**

```bash
pnpm exec astro check
```

Expected: `0 errors` (docs-only change; confirms nothing else regressed).

- [ ] **Step 4: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs(images): document benchmark scripts, on-page table, and cache caveat"
```

---

### Task 6: Sync the blog post (separate repo)

Add two light edits to the Part 4 blog post so its narrative matches the playground: point the "content decides manual vs auto" section at the playground's baked-text art images, and add a cache/measurement-honesty bullet. Do **not** touch the blog's site-specific LQIP details.

**Files:**
- Modify: `/home/jabel/code/projects/jeromeabel.github.io/src/content/serie/web-performance/04-images/index.md`

**Interfaces:** Prose only. This is a different git repository — commit there with `git -C`.

- [ ] **Step 1: Link the playground's baked-text demo in the content-vs-content section**

In the blog file, find the paragraph ending:

```
The framework's default is tuned for the common case; the uncommon case is exactly the one worth the manual work.
```

Append (same paragraph, after that sentence):

```
 The companion playground makes this visible: its `art` images bake hard-edged text onto free photos, so the `pixel-perfect` route serves a file that lands on the slot with crisp lettering while `auto` lets the browser resample and the text softens.
```

- [ ] **Step 2: Add a cache/measurement-honesty bullet to "What I Learned"**

In the `## What I Learned` list, find the bullet:

```
- LQIP and fade are perceived performance, not bytes. They won't move a Lighthouse score and that's fine — they're a different axis.
```

Insert immediately after it (new bullet on its own line):

```
- Measure cold, not warm. Lighthouse runs with an empty cache, so its numbers are first-visit; a manual reload is cached and always looks faster. Compare strategies cold (a 3-run median), and treat the warm reload as the *felt* experience, not the benchmark.
```

- [ ] **Step 3: Verify the edits landed**

```bash
F=/home/jabel/code/projects/jeromeabel.github.io/src/content/serie/web-performance/04-images/index.md
grep -c "companion playground makes this visible" "$F"   # 1
grep -c "Measure cold, not warm" "$F"                    # 1
```

Expected: both `1`.

- [ ] **Step 4: Commit in the blog repo**

```bash
git -C /home/jabel/code/projects/jeromeabel.github.io add src/content/serie/web-performance/04-images/index.md
git -C /home/jabel/code/projects/jeromeabel.github.io commit -m "docs(web-performance): sync Part 4 with playground baked-text demo + cache-cold note"
```

---

## Self-Review Notes

- **Spec coverage:**
  - §1 free Picsum dataset → Task 1.
  - §2 baked `W×H px` text (source art + manual per-file) + remove procedural path → Task 2.
  - §3 `.gitignore` un-ignore + commit 20 sources → Task 2 (Steps 4, 7).
  - §4 backup the procedural generator → Task 2 (Steps 1–2).
  - §5 measurement scripts + cache caveat + on-page display → Task 3 (export), Task 4 (hub table), Task 5 (docs).
  - §6 blog sync → Task 6.
  - Out-of-scope items (no HTML overlay, no new strategy/route/dep, no Astro bump, harness logic unchanged) honored — only `writeResults()` is added to `measure.mjs`, no logic change to medians.
- **Label format consistency:** `<W>×<H> px` with `×` (U+00D7) used in the generator (Task 2), the hub caption refers to it, and the docs (Task 5) match.
- **Benchmark shape consistency:** `{ generatedAt, rows: [{ strategy, runs, lcpMs, cls, bytes }] }` is produced in Task 3 and consumed identically in Task 4 (`r.strategy`, `r.lcpMs`, `r.cls`, `r.bytes`).
- **No test framework:** verification via `gen:images`, `astro check`, `pnpm build`, `node` assertions, and `curl` — matching the existing images plans.
- **Network dependency:** Task 2 Step 5 re-fetches Picsum once (after deleting sources). If offline, the regeneration fails — note in execution; sources are committed afterward so subsequent builds are offline-safe.
