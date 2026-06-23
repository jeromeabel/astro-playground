# Astro Playground

A collection of examples exploring Astro 6 features.

Companion repository for the blog post
[Adding API Endpoints to an Astro Project](https://dev.jeromeabel.net/blog/api-endpoints-with-astro).

## Live demo

https://astro-jeromeabel.netlify.app/

## Setup

```sh
pnpm install
pnpm dev
```

## Examples

- **[/residents](./src/pages/residents/index.astro)** — five server-side patterns:
  - `GET /api/residents/` — list residents
  - `GET /api/residents/[id]` — fetch one hero
  - `POST + redirect` (Pattern A) — `pages/residents/join-redirect.astro`
  - `POST + JSON` (Pattern B) — `pages/residents/join-json.astro`
  - `Astro Action` (Pattern C) — `pages/residents/join-action.astro`

The `residents` list lives in memory in `src/data/heroes.ts` and resets on
every cold start — see the blog post for the rationale.

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
