# Images Example — Free Dataset + Baked Text + Cache/Measurement Docs

**Date:** 2026-06-23
**Status:** Approved (design)
**Companion to:** Web Performance series Part 4 blog post
(`jeromeabel.github.io/src/content/serie/web-performance/04-images/index.md`)

## Goal

Sync the `/images` playground example with the blog post and the user's notes:

1. Use **only free images** (Picsum) — no procedurally generated sources.
2. **Bake label text into the image pixels** (via `sharp`), not as an HTML
   overlay. Hard-edged text demonstrates the resize/resample blur problem and
   identifies each image.
3. Document **cache vs. measurement**: why a second load is faster, and how to
   run Lighthouse cold vs. warm.
4. Keep the old generated-image generator as a **backup** "in case."

## Background (current state)

- Dataset (`src/data/gallery.json`): 20 items, `kind ∈ {photo, art}` × 10 each.
  Within each kind, `-01..-05` are Picsum, `-06..-10` are `sharp`-generated
  (`feTurbulence` plasma). `art` items composite a hard-edged text + rule overlay.
- Generator (`scripts/gen-images.mjs`): fetches Picsum for `source: "picsum"`,
  renders `plasmaSvg(i)` for `source: "generated"`, composites `overlaySvg(caption)`
  for `kind: "art"`, then emits manual width files + a baked blur into
  `public/manual/`.
- `.gitignore`: the 10 generated sources are ignored; Picsum sources are committed.
- `DemoImage.astro`: switches on 6 strategies (`naive`, `manual`, `auto`,
  `pixel-perfect`, `lqip`, `cropped`). No dimension/label text today.

## Design

### 1. Dataset → 20 free Picsum photos

- `gallery.json`: every entry becomes `source: "picsum"`. Keep the
  `kind: photo` (10, plain) vs `kind: art` (10, baked text) split.
- Rewrite the now-inaccurate `alt`/`caption` on the formerly-generated entries
  (`photo-06..10`, `art-06..10`) to real-photo wording. `photo-*` get plain
  descriptive captions; `art-*` keep short hard-edged captions (e.g. `SHARP EDGES`).
- Drop the `source: "generated"` value from the type union in `gallery.ts`
  (only `"picsum"` remains).

### 2. Baked text in `gen-images.mjs`

- **Remove** `plasmaSvg`, `tint`, and the `source === "generated"` branch in
  `baseBuffer`. `baseBuffer` always fetches Picsum.
- **Label format is real pixel dimensions:** every baked label reads
  `<W>×<H> px` for that exact file (e.g. `2400×1600 px` on the source,
  `640×427 px` on the 640-wide manual file). Hard-edged white fill + black
  stroke so resampling blur is visible; bottom-left with a thin rule.
- **`overlaySvg(w, h, caption?)`** stays and is the only text path. For **art
  items** it bakes the hard-edged caption + `<W>×<H> px` onto the source. The
  caption is the resize-blur subject; the dimensions identify the file.
- **Manual per-file labels:** when emitting each `public/manual/<id>-<w>.jpg`,
  composite that file's real `<W>×<H> px` (its actual resized dimensions, not
  the `w` descriptor) into the file *before* writing it. So the served `manual`
  file literally displays its own size — true "which image loaded." All 20
  items' manual files (cheap, build-time only).
- Honest limit (documented, not worked around): the `<Picture>` strategies
  (`auto`, `pixel-perfect`, `lqip`, `cropped`) generate width variants from a
  single source — Astro owns that output, so per-variant dimension text cannot
  be baked. They show the baked *source* label scaled (still demonstrates resize
  blur), not the exact served size. Only `manual` (files we cut ourselves)
  carries a true per-served-file label.

### 3. `.gitignore`

- Remove the 10 `src/assets/demo/{photo,art}-0[6-9].jpg` / `-10.jpg` ignore
  lines. All 20 Picsum sources are now committed (deterministic, offline-safe,
  ~a few MB total). `public/manual/` and `scripts/lh/*.json` stay ignored.

### 4. Backup the generated-image path

- Move the current generator to `scripts/backup/gen-images-generated.mjs`
  (verbatim copy, before edits) plus a one-line `scripts/backup/README.md`
  noting it reproduces the procedural dataset deterministically (fixed seed →
  byte-identical), so the script *is* the backup; no binaries committed.

### 5. Measurement & benchmark — scripts, cache caveat, on-page display

**Scripts (existing, documented):**
- `scripts/lighthouse.mjs` — runs Lighthouse 13 three times against one
  strategy's list route via `pnpm preview`.
- `scripts/measure.mjs` — reads `scripts/lh/*.json`, takes the per-metric
  median, prints the LCP / CLS / bytes table.
- `scripts/benchmark.mjs` (`pnpm benchmark:images`) — orchestrates all
  strategies then prints the table.

**Cache caveat (docs in `README.md` + `CLAUDE.md`):**
- Lighthouse runs cold by default — its LCP/bytes are first-visit numbers.
- A manual browser reload is warm (disk/memory cache), which is why "the next
  load is faster"; warm reloads are not a fair strategy comparison.
- `pnpm benchmark:images` is the cold, repeatable measure; to feel warm
  behavior, reload in the browser with DevTools Network open.

**On-page display (new):**
- `measure.mjs` gains a `writeResults()` that also emits the medians to a
  committed `src/data/benchmark.json` (`{ generatedAt, runs, rows: [{ strategy,
  lcpMs, cls, bytes }] }`). `benchmark:images` calls it after printing.
- The `/images` hub (`src/pages/images/index.astro`) imports that JSON and
  renders a **results table** below the strategy list: one row per strategy,
  columns LCP (ms) / CLS / bytes (KB), best value per column emphasized. A
  short caption states the numbers are cold-cache Lighthouse medians and names
  the command to refresh them.
- Graceful empty state: if `benchmark.json` is absent or has no rows, the hub
  shows a "no measurements yet — run `pnpm benchmark:images`" note instead of a
  table. Commit a valid empty-shape `benchmark.json` so the build never breaks.

### 6. Blog sync (`jeromeabel.github.io`, separate repo)

- In the "manual vs automatic is decided by image content" section: add one
  sentence pointing at the playground's `art` images (hard-edged text baked onto
  free photos) as the live, local demo of resample blur — alongside the existing
  external comic-site reference.
- Near the perceived-performance / measurement discussion: add one
  cache-honesty line (cold Lighthouse vs. warm reload), mirroring §5.
- Do **not** change the blog's site-specific LQIP details (1200ms fade, separate
  `<img>`, jpg placeholder). Those describe jeromeabel.github.io and are framed
  as deliberate variants vs. the comic site; the playground's `.4s` /
  `pictureAttributes` background variant is a valid sibling, not a drift to fix.

## Out of scope

- No HTML/runtime dimension overlay (explicitly rejected — text is baked in).
- No new strategy, route, or dependency.
- No change to the Lighthouse harness logic, the `sizes` helper, or `reveal-img.ts`.
- No Astro version change (pinned `^6.4.8`).

## Verification (no test framework)

- `pnpm gen:images` → 20 sources in `src/assets/demo/`, captions sane, no
  generated/plasma output. Manual files carry baked `<w>w` badges.
- `pnpm exec astro check` → 0 errors.
- `pnpm exec astro build` → succeeds; all routes prerender.
- `curl` smoke tests: every `gallery.json` entry is `source: "picsum"`; a
  `manual` file visibly differs per width (size check + spot visual).
- `node scripts/measure.mjs` writes a valid `src/data/benchmark.json`; the hub
  renders the results table when rows exist and the empty-state note when they
  don't (build succeeds in both cases).
- User verifies baked `W×H px` text + the resize-blur effect visually at
  `http://localhost:4321/images/manual` and `/images/pixel-perfect`, and the
  benchmark table on `http://localhost:4321/images`.
