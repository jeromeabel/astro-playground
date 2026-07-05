# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — start dev server (http://localhost:4321)
- `pnpm build` — type-check (`astro check`) then build
- `pnpm preview` — preview production build (no image CDN — use `netlify serve` for accurate benchmarks)
- `netlify serve` — serve production build with Netlify CDN emulation (port 8888); required for `/.netlify/images` to resolve

## Architecture

Astro 7 playground — a collection of standalone examples, each exploring a different Astro feature. The home page (`src/pages/index.astro`) is a minimal hub linking to each example.

Astro 7 with Tailwind CSS 4 (via Vite plugin, not Astro integration) and strict TypeScript.

**Rendering mode:** hybrid — pages are static by default; API routes, actions, and any page using `Astro.getActionResult()` must opt out with `export const prerender = false`.

**Two patterns for server logic:**

1. **API Routes** (`src/pages/api/`) — standard REST endpoints exporting `GET`/`POST`/etc. as `APIRoute` functions that return `new Response(...)`. The subscribers routes serve data from a local in-memory heroes array.
2. **Astro Actions** (`src/actions/index.ts`) — form-based mutations using `defineAction` with Zod validation via `astro/zod` (Zod v4; use `z.email()` not `z.string().email()`). Consumed in pages via `actions` import from `astro:actions` and `Astro.getActionResult()`.

### Residents example (`/residents`)

Demonstrates API routes + Astro Actions with a generic "Heroes Retirement Home" theme. The hero roster lives in `src/data/heroes.ts` (not persisted — in-memory only). Three POST patterns are shown side by side: A (redirect), B (JSON), C (Astro Action). The `join` action only accepts emails from the pre-defined retired heroes list; any other email throws an `ActionError` with a rejection message. On success, a personalized welcome is shown for that request. Nothing is saved across cold starts; it's a demo.

Shared shell: `src/layouts/Layout.astro` provides the HTML head (favicons, theme-color) and a light-by-default body with `dark:` variants that follow `prefers-color-scheme`. Reusable bits live in `src/components/` (`Icon.astro` for inline SVG icons, `HeroPortrait.astro` for portraits with an initial-avatar fallback when `src/assets/heroes/{id}.jpg` is missing, `Breadcrumb.astro` for a generic breadcrumb trail). Feature-specific code is collocated under `src/features/<feature>/` — see the Optimg example.

## Optimg example

`/optimg` demonstrates seven image-optimization strategies (`naive`, `manual`,
`auto`, `pixel-perfect`, `lqip`, `cropped`, `final`) over a deterministic 20-image
dataset. `final` is the production stack — LQIP placeholder + cache-guarded fade,
over pixel-perfect token widths. Natural 3:2 by default; per-image crop is opt-in
and **off by default** (`crop: true` in `gallery.json` → 16:9 cover / 4:3 thumb).

- **Feature folder:** all optimg-only code is collocated under
  `src/features/optimg/` — `components/CustomImage.astro`, `lib/{sizes,strategies,demo-images}.ts`,
  `scripts/{img-audit,reveal-img}.ts`, and `data/{gallery.json,gallery.ts,benchmark.json}`.
  Only the routes live in `src/pages/optimg/` (Astro requires it); the image
  *sources* stay in `src/assets/optimg/` (absolute glob + generator depend on it).
  Imports use TS path aliases from `tsconfig.json`: `@optimg/*` → `src/features/optimg/*`,
  `@components/*`, `@layouts/*`, `@/*` → `src/*`.
- **Single source of truth:** `src/features/optimg/data/gallery.json` (typed by
  `gallery.ts` beside it). Both the generator and the routes read it, so the
  dataset never drifts.
- **Generator:** `scripts/gen-images.mjs` (`pnpm gen:optimg`, runs before `build`)
  uses `sharp` to derive both `src/assets/optimg/` sources and hand-cut widths + blur
  in `public/manual/` from the committed raw originals in
  `src/assets/optimg/original/` — **no build-time network**. The old picsum fetch +
  offline-plasma fallback is gone; if an original is missing, the generator errors
  out and tells you to run `pnpm fetch:originals`. See **Dataset is all free** below
  for the full reproducibility tiering.
- **Rendering:** `src/features/optimg/components/CustomImage.astro` reads a resolved
  `Options` bundle (from the `StrategyDef` records in `lib/strategies.ts`, via `resolveOptions()`)
  — no `strategy ===` switch. `sizes` strings **and** the pixel-perfect/`final` `widths`
  come from `src/features/optimg/lib/sizes.ts`, which is a derive-only pipeline:
  `layout` (the only literals) → `slot()`/`retina()` → `slots` (named integer map)
  → `exact`/`approx` bundles, each keyed `grid`/`cover`. `CustomImage` picks a context
  once (`const ctx = isCover ? "cover" : "grid"`) and reads `approx[ctx]` (vw "good
  enough") or `exact[ctx].{sizes,widths,width}` (pixel-perfect). An explicit `widths`
  prop is kept by Astro's `||=`, so the served file lands on the slot at 1x and 2x
  with no resampling. The `border` token is `0`
  here — wrappers are borderless so the slot is a clean 720; a bordered card would
  set it. The LQIP/`final` fade is `src/features/optimg/scripts/reveal-img.ts`.
- **Below-fold loading:** every non-naive strategy marks grid thumbs
  `loading="lazy"` (cover slots stay `eager fetchpriority="high"`, above-fold);
  `naive` emits a bare `<img>` with **no** `loading` attr → browser-default eager,
  so all 20 thumbs fetch upfront. That eager-all is the intended worst case `naive`
  teaches, not a bug. Guarded by a data-driven Container-API test over
  `STRATEGY_IDS` in `__tests__/CustomImage.test.ts` (Task D). Runtime check: `pnpm dev`,
  DevTools Network + throttle, scroll `/optimg/final` (thumbs fetch on scroll) vs
  `/optimg/naive` (all 20 upfront).
- **Config:** `astro.config.mjs` sets `image.responsiveStyles: true` (required for
  the `<Picture>` routes to be responsive). Tailwind 4 utilities live in a cascade
  layer and lose to Astro's unlayered responsive styles, so override `object-fit`/
  `object-position` via the component's `fit`/`position` props, not Tailwind classes.
- **Slot tokens must match the page container:** `lib/sizes.ts` `layout.maxWidth`
  is `1024` because both optimg routes wrap their grid in `max-w-5xl` (1024px). If
  that token drifts from the real container, `pixel-perfect`/`final` emit
  undersized `sizes` and the browser fetches a too-small file (the `✗ short`
  bug).
- **Grid gap is `14px` (not `16`), for true pixel-perfect:** the gap is chosen so
  every *fixed* slot divides to an integer; `gap-4` (16) left the lg 3-col slot at
  `314.67px`, so the served file landed on a fractional slot → a sub-pixel resample.
  The grid `<ul>` in `[strategy]/index.astro` drives its gap from `layout.gap`
  (inline `style`), the **same** token `slot()` divides by, so the spacing and the
  pixel-perfect widths can't drift — there's no class left to hand-sync. The mobile
  1-col slot is `calc(100vw − …)` — inherently fluid, so it's best-effort, never
  integer. The integer-tiling contract is locked by `__tests__/sizes.test.ts`
  (a fractional gap fails the tiling invariant). **Verify in dev** (no rebuild, no
  `netlify serve` needed — the `sizes` string + `widths` are computed at render
  time): `pnpm dev` → `/optimg/pixel-perfect?debug`, confirm the lg 3-col card reads
  `slot 316 · 316w · ✓ ok` at DPR 1 (`632w` at DPR 2). Run `netlify serve` + `benchmark:optimg` only for
  fresh LCP/bytes numbers.
- **Measurement:** `pnpm benchmark:optimg http://localhost:8888` runs Lighthouse 13
  (3-run median) against `netlify serve`, prints LCP / CLS / bytes across the seven
  strategies, and writes `src/features/optimg/data/benchmark.json` (rendered as a table on the
  `/optimg` hub). Must use `netlify serve` (not `pnpm preview`) — `auto`, `pixel-perfect`,
  `lqip`, `cropped`, and `final` emit `/.netlify/images?...` URLs that 404 on the plain preview server,
  skewing results. Lighthouse is cold-cache; a warm reload is faster but not a fair comparison.
- **Blog captures:** to record a strategy as a looping `<video>` for the blog post, see
  `src/features/optimg/scripts/capture.md` — `video-to-web.sh` (ffmpeg wrapper) converts a
  screen recording into a web-tiny mp4+webm. Raw + converted clips live in the git-ignored
  `captures/` dir; promotion into the blog repo is a manual step.
- **Dataset is all free:** 21 `gallery.json` entries (`source: "picsum"`), 7 rows × 3 cols
  in the grid. `sharp` bakes a hard-edged label onto every source (resized `public/manual/`
  widths + blur inherit it, scaling down with the image). Overlays dispatched 3-by-3, one
  overlay style per row:

  | Row | Photos | Overlay | What it tests |
  |-----|--------|---------|---------------|
  | 1 | 01–03 | **a** | caption panel + 1px hairlines |
  | 2 | 04–06 | **b** | fine vertical grating (moiré at non-exact widths) |
  | 3 | 07–09 | **c** | title size ladder 8→84px |
  | 4 | 10–12 | **combo** | b grating + a panel stacked |
  | 5 | 13–15 | **d** | large bold title, survives all downscales |
  | 6 | 16–18 | **e** | two-scale moiré (derived bands 38/12) |
  | 7 | 19–21 | **d** | second d row, neutral baseline |

  Pick a fallback treatment with `OVERLAY=a|b|c|combo|d|e pnpm gen:optimg` (default `combo`,
  used only for photos without an explicit `overlay` in `gallery.json`).
  **e** uses **derived** periods: grid band `p0(316)=38` (5 CSS px at the 316px 3-col thumb)
  stacked over cover band `p0(976)=12` (5 CSS px at the 976px solo page). Formula in
  `scripts/moire.mjs`; contract test asserts slot constants match `lib/sizes.ts`. Compare
  `/optimg/auto` vs `/optimg/pixel-perfect` at 1280px — row 6 (photo-16/17/18) beats on
  `auto`, crisp on `pixel-perfect`. DPR 2 on a cover page gives the sharpest contrast.
  Re-bake specific photos with `FORCE=photo-16,photo-17,photo-18 pnpm gen:optimg`
  (comma list, validated); `FORCE=all` or `FORCE=1` re-bakes everything.
  Re-test a style: `OVERLAY=b FORCE=all pnpm gen:optimg`.
  The pre-2026-06-23 procedural generator is kept at `scripts/backup/gen-images-generated.mjs`.
- **Reproducibility tiers** — three stages, each with a different regeneration story:

  | Tier | Path | Committed? | How it's (re)made |
  |------|------|------------|--------------------|
  | Raw input | `src/assets/optimg/original/<id>.jpg` | yes | Fetched once via `pnpm fetch:originals` (Unsplash API, Unsplash License); never re-downloaded on rebuild. Re-fetch a specific id with `FORCE=photo-04,photo-05 pnpm fetch:originals`, or all with `FORCE=all`. |
  | Derived source | `src/assets/optimg/<id>.jpg` | yes | Baked by `pnpm gen:optimg` from the matching `original/<id>.jpg` — normalized to 3:2, overlay label applied. Deterministic given the same original + `gallery.json`, so builds don't need to re-bake; CI doesn't need to run the generator to get a working checkout. |
  | Manual widths + blur | `public/manual/*.jpg` | no (git-ignored) | Derived from the `src/assets/optimg/<id>.jpg` tier by `pnpm gen:optimg`, which runs before `build`. |

  `gen-images.mjs` itself does **no build-time network** — the picsum-fetch-at-build-time
  and offline-plasma-fallback paths from the old generator are gone; it only ever reads
  from the committed `original/` tier. If an original is missing it errors out rather than
  silently substituting a placeholder.
- **Running Astro 7.0.0** (`^7.0.0` in package.json).

## Conventions

- Tailwind 4: imported via `@import "tailwindcss"` in `src/styles/global.css`, configured as a Vite plugin in `astro.config.mjs` (not `@astrojs/tailwind`).
- Use `pnpm`, not `npm`.
- **Specs:** planning artifacts live in `.specs/<date>-<initiative>/` (git-ignored,
  local-only) — one folder per initiative holding `design.md` / `plan.md` / `todo.md`
  (+ `research.md` / `review.md` when they exist). This unifies both spec workflows;
  put new design/plan/todo docs here, **not** in `docs/superpowers/` or `tasks/`
  (their tool defaults). `.superpowers/sdd/` stays the superpowers process scratch.
