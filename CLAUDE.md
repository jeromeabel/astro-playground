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

Shared shell: `src/layouts/Layout.astro` provides the HTML head (favicons, theme-color) and a light-by-default body with `dark:` variants that follow `prefers-color-scheme`. Reusable bits live in `src/components/` (`Icon.astro` for inline SVG icons, `HeroPortrait.astro` for portraits with an initial-avatar fallback when `src/assets/heroes/{id}.jpg` is missing, `Breadcrumb.astro` for a generic breadcrumb trail). Feature-specific code is collocated under `src/features/<feature>/` — see the Images example.

## Images example

`/images` demonstrates seven image-optimization strategies (`naive`, `manual`,
`auto`, `pixel-perfect`, `lqip`, `cropped`, `final`) over a deterministic 20-image
dataset. `final` is the production stack — LQIP placeholder + cache-guarded fade,
over pixel-perfect token widths. Natural 3:2 by default; per-image crop is opt-in
and **off by default** (`crop: true` in `gallery.json` → 16:9 cover / 4:3 thumb).

- **Feature folder:** all images-only code is collocated under
  `src/features/images/` — `components/DemoImage.astro`, `lib/{sizes,strategies,demo-images}.ts`,
  `scripts/{img-audit,reveal-img}.ts`, and `data/{gallery.json,gallery.ts,benchmark.json}`.
  Only the routes live in `src/pages/images/` (Astro requires it); the image
  *sources* stay in `src/assets/demo/` (absolute glob + generator depend on it).
  Imports use TS path aliases from `tsconfig.json`: `@images/*` → `src/features/images/*`,
  `@components/*`, `@layouts/*`, `@/*` → `src/*`.
- **Single source of truth:** `src/features/images/data/gallery.json` (typed by
  `gallery.ts` beside it). Both the generator and the routes read it, so the
  dataset never drifts.
- **Generator:** `scripts/gen-images.mjs` (`pnpm gen:images`, runs before `build`)
  uses `sharp` to produce sources in `src/assets/demo/` and hand-cut widths + blur
  in `public/manual/`. All 20 sources are committed; `public/manual/` files are
  git-ignored and reproduced on demand.
- **Rendering:** `src/features/images/components/DemoImage.astro` switches on
  `strategy`. `sizes` strings **and** the pixel-perfect/`final` `widths` come from
  `src/features/images/lib/sizes.ts`
  (token-derived; an explicit `widths` prop is kept by Astro's `||=`, so the served
  file lands on the slot at 1x and 2x with no resampling). The `border` token is `0`
  here — wrappers are borderless so the slot is a clean 720; a bordered card would
  set it. The LQIP/`final` fade is `src/features/images/scripts/reveal-img.ts`.
- **Config:** `astro.config.mjs` sets `image.responsiveStyles: true` (required for
  the `<Picture>` routes to be responsive). Tailwind 4 utilities live in a cascade
  layer and lose to Astro's unlayered responsive styles, so override `object-fit`/
  `object-position` via the component's `fit`/`position` props, not Tailwind classes.
- **Measurement:** `pnpm benchmark:images http://localhost:8888` runs Lighthouse 13
  (3-run median) against `netlify serve`, prints LCP / CLS / bytes across the seven
  strategies, and writes `src/features/images/data/benchmark.json` (rendered as a table on the
  `/images` hub). Must use `netlify serve` (not `pnpm preview`) — `auto`, `pixel-perfect`,
  `lqip`, `cropped`, and `final` emit `/.netlify/images?...` URLs that 404 on the plain preview server,
  skewing results. Lighthouse is cold-cache; a warm reload is faster but not a fair comparison.
- **Dataset is all free:** every `gallery.json` entry is `source: "picsum"`. `sharp`
  bakes a hard-edged label onto every source (resized `public/manual/` widths + blur
  inherit it, scaling down with the image). `photo` sources get a large bold **title**
  that survives downscaling. `art` sources get a resampling-demo overlay whose fine,
  hard-edged detail goes blurry/moiré at non-exact widths — the motivation for the
  pixel-perfect strategy. Pick the treatment with `OVERLAY=a|b|c|combo pnpm gen:images`
  (default `combo`): **a** = small-text caption panel + 1px hairlines, **b** = fine
  vertical grating (moiré), **c** = title size ladder (8→84px). Re-test a style on the
  same photos with `rm src/assets/demo/art-*.jpg && OVERLAY=b pnpm gen:images`.
  The pre-2026-06-23 procedural generator is kept at `scripts/backup/gen-images-generated.mjs`.
- **Running Astro 7.0.0** (`^7.0.0` in package.json).

## Conventions

- Tailwind 4: imported via `@import "tailwindcss"` in `src/styles/global.css`, configured as a Vite plugin in `astro.config.mjs` (not `@astrojs/tailwind`).
- Use `pnpm`, not `npm`.
