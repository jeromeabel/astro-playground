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
- No sourced/licensed assets beyond seeded Picsum photos — the rest is generated.
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

`scripts/gen-images.mjs` — Node script using `sharp` (present transitively via
`astro:assets`; added explicitly to `devDependencies`). 20 source images, ~2400px
wide, deliberately heavy so `/images/naive` is genuinely fat and the measurement
contrast is real.

**Two source pools (10 + 10):**

- **Picsum (10)** — fetched once at gen time from seeded URLs
  (`https://picsum.photos/seed/<id>/2400/1600`). Seed = deterministic same photo
  every run. Real continuous-tone photos: the honest "photos tolerate auto
  resampling" proof. Fetched into `src/assets/demo/` and committed (small, stable).
- **Generated (10)** — fully offline via `sharp` rasterizing an SVG `feTurbulence`
  plasma (`type="fractalNoise"`, fixed `seed="<i>"`) tinted by an index-derived
  gradient. Continuous-tone, edge-free, **deterministic — no `Math.random`**.

**Two kinds (10 + 10), independent of source pool:**

- **`photo` (10)** — clean, no overlay. The "auto `layout` is fine" case.
- **`art` (10)** — same bases with a composited **SVG text + thin-rule overlay**
  (`sharp(base).composite([{ input: textSvgBuffer }])`): bold high-contrast glyphs
  and a 2px line, vector-rasterized at full source res. When the browser resamples
  to a slightly-off slot width these hard edges soften/shimmer — the failure
  `/images/pixel-perfect` fixes. Fixed caption string per index, so deterministic.

Spread sources across kinds so the split isn't confounded with the source:
**5 picsum-clean, 5 picsum-text, 5 gen-clean, 5 gen-text.** Each item is named by
kind+index (`photo-01.jpg` … `photo-10.jpg`, `art-01.jpg` … `art-10.jpg`).

Outputs:

- `src/assets/demo/` — the 20 source images, imported by the astro:assets routes.
- `public/manual/` — for each item, a handful of pre-cut widths
  (`<id>-640.jpg`, `-960`, `-1280`, `-1920`) plus one baked-blur 32px
  (`<id>-blur.jpg`). These are the framework-free artifacts the `manual` route
  references by URL — the honest "bash era" output.

Wiring: `gen:images` runs before the build. `build` becomes
`gen:images && astro check && astro build`. The Picsum sources are committed
(deterministic + small); the offline-generated images and `public/manual/` widths
are git-ignored and reproduced on demand. The script is the source of truth.
Gen-images is idempotent: it skips re-fetching Picsum files that already exist, so
offline builds work once the photos are committed.

## Dataset manifest

`src/data/gallery.ts` exports the 20-entry manifest consumed by every route:

```ts
export interface GalleryItem {
  id: string;                          // "photo-01" | "art-01"
  kind: "photo" | "art";               // art => text/rule overlay
  source: "picsum" | "generated";      // drives gen-images.mjs
  alt: string;
  caption: string;                     // also the overlay text for kind "art"
}
export const gallery: GalleryItem[];   // 20 entries, 5 per (kind × source) cell
```

`gen-images.mjs` reads this same manifest, so the dataset and the routes never
drift: the script's per-item branch is `(source → fetch|generate)` then
`(kind === "art" → composite caption overlay)`.

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

*(Verified against Astro v6 docs, 2026-06-23.)*

`astro.config.mjs` — add `image: { responsiveStyles: true }` (default is `false`;
without it — or your own CSS — the `<Picture>` routes are not actually responsive).
It only affects `layout` = `constrained | full-width | fixed`, so it touches
`/auto`, `/pixel-perfect`, `/lqip` and leaves `naive`/`manual` alone.

The Tailwind 4 caveat is the teaching point and is still current: Tailwind's
utilities live in a cascade layer, so they always lose to Astro's unlayered
`:where([data-astro-image])` responsive styles. The `/auto` note demonstrates a
Tailwind `object-*` class being overridden, then shows the **correct fix**: override
`object-fit`/`object-position` via the component's `fit`/`position` props (per docs),
not a Tailwind class. Alternatively, leave `responsiveStyles` `false` and own the CSS.

**Astro 6 emission detail (don't chase the v5 form):** in v6, responsive styles are
emitted at build time as a hashed class plus `data-astro-fit`/`data-astro-pos`
attributes (CSP-safe), replacing v5's inline `style="--fit; --pos"`. The
`data-astro-image="<layout>"` attribute remains. The LQIP route must therefore reach
the outer element via `pictureAttributes` and must not assume an inline `--fit` style
exists.

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
src/assets/demo/                # sources: picsum committed, generated gitignored
public/manual/                  # generated manual width files (gitignored)
```

Touched: `astro.config.mjs`, `package.json` (scripts + `sharp` dev dep),
`.gitignore`, `README.md`, `CLAUDE.md`, `src/pages/index.astro`.

## Risks / open questions

- **sharp as a direct dep** — it's transitive today; adding it explicitly to
  `devDependencies` pins it for the generator. Low risk.
- **Lighthouse noise** — 3-run median chosen over single-run; if still jumpy,
  bump to 5. Documented, not silently capped.
- **Picsum network dependency at gen time** — half the set is fetched from
  `picsum.photos`. Mitigated by committing those 10 jpgs (seeded, stable) so builds
  after the first gen are offline. Upstream could change a seed's photo; committed
  files pin it.
- **Generated half looks synthetic** — accepted; feTurbulence is continuous-tone and
  edge-free, so the resampling point still holds. Only visual realism suffers, and
  the real Picsum half carries the "photos tolerate auto" proof.
- **No ClientRouter in playground** — `reveal-img.ts` binds both `DOMContentLoaded`
  and `astro:page-load` so it works with or without View Transitions.
```
