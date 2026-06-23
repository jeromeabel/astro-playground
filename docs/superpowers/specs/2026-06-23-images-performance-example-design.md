# Images Performance Example — Design

**Date:** 2026-06-23
**Status:** Approved for planning
**Companion to:** Web Performance series Part 4 — *Fast Images in Astro: What the Framework Automates, and the One Piece It Doesn't*

## Purpose

Add an `images` example to astro-playground that turns the blog post's claims into
runnable, measurable routes. Each route isolates one image-optimization technique
from the post, and a light Lighthouse harness proves the LCP / CLS / byte-weight
story the post asserts. Same per-example pattern as the existing `/residents`
example: a hub page links into the demo, shared components do the work.

## Goals

- One route per technique, progressive from unoptimized to fully optimized.
- A reproducible 20-image dataset (no sourcing, no licensing, deterministic).
- A measurement step that prints LCP / CLS / total bytes side by side across routes.
- Every point in the blog post maps to a route or a documented note.

## Non-goals

- No python benchmark harness (the vue-playground rig is overkill here).
- No real photography or comic assets — all images are generated.
- No persistence, no backend. Static + adapter only.
- Not a redesign of the playground shell; reuse `Layout.astro` and Tailwind 4.

## Blog-point coverage map

| Blog point | Where it lives in this example |
|---|---|
| Bash-era `srcset`/`sizes`, hand-cut widths, baked blur | `/images/manual` route + `public/manual/` width files |
| `<Picture>` removes toil: formats, `srcset`, `sizes`, auto `width`/`height` (CLS) | `/images/auto` route |
| Static `/_astro/` output works anywhere (GitHub Pages) | README note; local `preview` build is the proof |
| Sharp build-time vs Netlify Image CDN request-time | Same routes measured twice (local preview vs deployed) + README note |
| `responsiveStyles` + Tailwind 4 cascade-layer gotcha | `astro.config` flag + note on `/auto` |
| LQIP via `getImage()`, fade, `img.complete` cache guard | `/images/lqip` route + `reveal-img.ts` |
| CSS blur vs baked blur tradeoff | Note on `/images/lqip` |
| `sizes` from layout tokens (accuracy) | `/images/pixel-perfect` route |
| Content-driven manual-vs-auto (photo vs line art) | Dataset split (photo vs art) shown across `/auto` and `/pixel-perfect` |
| Eager hero vs lazy rest (`loading`/`fetchpriority`) | `type="cover"` on every detail page |
| Unoptimized baseline (measurement floor) | `/images/naive` route |

## Dataset

`scripts/gen-images.mjs` — Node script using `sharp` (already present transitively
via `astro:assets`; added explicitly to `devDependencies`). Deterministic: every
pixel/color is a function of the image index, so **no `Math.random`** and the output
is byte-stable across runs.

Twenty images, two kinds:

- **10 photo-like** (`photo-01.jpg` … `photo-10.jpg`) — multi-stop gradient plus
  index-seeded noise, ~2400px wide, deliberately heavy. Purpose: tolerate auto
  resampling (the "photos are fine on auto `layout`" case) and make `/images/naive`
  genuinely fat so the measurement contrast is real.
- **10 line-art/text** (`art-01.png` … `art-10.png`) — SVG rasterized by sharp:
  bold glyphs, thin strokes, hard edges. Purpose: the case where a wrong served
  width visibly shimmers, justifying `/images/pixel-perfect`.

Outputs:

- `src/assets/demo/` — the 20 source images, imported by the astro:assets routes.
- `public/manual/` — for each photo, a handful of pre-cut widths
  (`photo-01-640.jpg`, `-960`, `-1280`, `-1920`) plus one baked-blur 32px
  (`photo-01-blur.jpg`). These are the framework-free artifacts the `manual` route
  references by URL — the honest "bash era" output.

Wiring: `gen:images` runs before the build. `build` becomes
`gen:images && astro check && astro build`. Generated dirs are git-ignored
(reproducible on demand); the script is the source of truth.

## Dataset manifest

`src/data/gallery.ts` exports the 20-entry manifest consumed by every route:

```ts
export interface GalleryItem {
  id: string;          // "photo-01" | "art-01"
  kind: "photo" | "art";
  alt: string;
  caption: string;
}
export const gallery: GalleryItem[];
```

Routes derive their image list and `getStaticPaths` from this single array.

## Routes

Five strategies, each rendered as a **list** (responsive grid) and a **detail**
(single large image). One dynamic param keeps it DRY.

| Route | Strategy | What it renders |
|---|---|---|
| `/images` | — | hub: explains the five strategies, links each list |
| `/images/[strategy]` | list | responsive grid of all 20, exercises multi-column `sizes` |
| `/images/[strategy]/[id]` | detail | one large image as the LCP element, `type="cover"` |

`strategy ∈ { naive, manual, auto, pixel-perfect, lqip }`.
`getStaticPaths` fans `strategy × {list}` and `strategy × id` for details.

Strategy semantics (all routed through `DemoImage.astro`):

- **naive** — plain `<img src={fullSize}>`, no `srcset`, no `sizes`, no `width`/`height`.
  The floor: worst bytes, worst CLS.
- **manual** — hand-written `<img srcset sizes>` over the `public/manual/` width
  files, baked-blur placeholder. No `astro:assets`. The bash era, done right.
- **auto** — `<Picture src formats={["avif","webp"]} layout="constrained">`, Astro
  generates `srcset` + `sizes` + auto `width`/`height`. The toil-deletion case.
- **pixel-perfect** — `<Picture>` with `sizes` computed from layout tokens
  (page max-width, padding, gap, column count) so the served file lands on the slot
  with no resampling. Aimed at the `art` images.
- **lqip** — everything in `auto`, plus a `getImage()` 32px blurred placeholder, the
  real picture starting at `opacity:0` via `pictureAttributes`, and a load-driven
  fade with an `img.complete` cache guard. `type="cover"` images load
  `eager`/`fetchpriority="high"`; thumbs stay `lazy`.

## Components & scripts

- `src/components/DemoImage.astro` — props `{ item: GalleryItem, strategy, type }`.
  Switches on `strategy` to emit the correct markup. Single teaching surface.
- `src/components/Lqip.astro` *(optional split)* — if `DemoImage` grows unwieldy, the
  LQIP branch moves here; `getImage()` placeholder + hidden `<Picture>`. Decide
  during implementation; default is inline until it earns a split.
- `src/scripts/reveal-img.ts` — fades revealed images in on `load`; guards on
  `img.complete` (and `naturalHeight !== 0`) to skip the animation for cached
  images. Registered on `DOMContentLoaded` and `astro:page-load` (defensive; the
  playground `Layout` has no `ClientRouter` today, but the post teaches the VT-safe
  form).
- `src/lib/sizes.ts` — exports the layout tokens (max-width, padding, gap, columns)
  and a helper that builds the `pixel-perfect` `sizes` string from them, so the grid
  CSS and the `sizes` attribute derive from one source.

## Measurement

Light, no python. Run against `pnpm preview` (a real production build = Sharp
build-time output).

- `pnpm lighthouse:<strategy>` — `pnpm dlx lighthouse@13` against
  `http://localhost:4321/images/<strategy>`, `--preset=desktop`,
  `--only-categories=performance`, JSON out to `scripts/lh/<strategy>-<run>.json`,
  headless chrome flags matching the vue-playground invocation.
- 3-run median per strategy (small bash loop) to tame single-run noise — far below
  the vue-playground 5-run python rig, enough to be honest.
- `scripts/measure.mjs` — reads the JSON, extracts
  `largest-contentful-paint`, `cumulative-layout-shift`, `total-byte-weight`, takes
  the median across runs, prints a side-by-side table across all five strategies.
- `pnpm benchmark:images` — orchestrates: assumes `preview` is running, runs all
  strategies, prints the table.

README documents running it twice: local `preview` (Sharp) vs the deployed Netlify
URL (Image CDN). Identical `/_astro/` files, different transform timing — which is
the blog's Sharp-vs-Netlify point made concrete, not a separate route.

## Config

`astro.config.mjs` — add `image: { responsiveStyles: true }` and a one-line comment
pointing at the Tailwind 4 cascade-layer caveat (Astro's `:where([data-astro-image])`
rules outrank Tailwind's layered utilities). README expands the note.

## Docs

- `README.md` — new "Images" section: the five routes, how to generate the dataset,
  how to run the benchmark, the Sharp-vs-Netlify two-host note.
- `CLAUDE.md` — short architecture paragraph for the images example.
- `src/pages/index.astro` — add the images example to the hub.

## File inventory

```
scripts/gen-images.mjs          # dataset generator (sharp, deterministic)
scripts/measure.mjs             # lighthouse JSON -> median table
src/data/gallery.ts             # 20-image manifest
src/lib/sizes.ts                # layout tokens + pixel-perfect sizes helper
src/components/DemoImage.astro  # strategy-switched renderer
src/scripts/reveal-img.ts       # LQIP fade + cache guard
src/pages/images/index.astro    # hub
src/pages/images/[strategy]/index.astro   # list (grid)
src/pages/images/[strategy]/[id].astro    # detail
src/assets/demo/                # generated sources (gitignored)
public/manual/                  # generated manual width files (gitignored)
```

Touched: `astro.config.mjs`, `package.json` (scripts + `sharp` dev dep),
`.gitignore`, `README.md`, `CLAUDE.md`, `src/pages/index.astro`.

## Risks / open questions

- **sharp as a direct dep** — it's transitive today; adding it explicitly to
  `devDependencies` pins it for the generator. Low risk.
- **Lighthouse noise** — 3-run median chosen over single-run; if still jumpy,
  bump to 5. Documented, not silently capped.
- **Generated photos look synthetic** — accepted tradeoff (user chose all-generated).
  Bytes/LCP story is unaffected; only visual realism suffers.
- **No ClientRouter in playground** — `reveal-img.ts` binds both `DOMContentLoaded`
  and `astro:page-load` so it works with or without View Transitions.
```
