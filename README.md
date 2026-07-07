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

- **[/optimg](./src/pages/optimg/index.astro)** — eight image-optimization
  strategies from the Web Performance series (Part 4), each measurable. The set
  is defined once in `src/features/optimg/lib/strategies.ts`; the hub and the
  `/optimg/[strategy]` route both enumerate it.
  - `naive` — plain `<img>`, full-size, no `srcset`/`sizes`/dimensions (the floor)
  - `manual` — hand-cut widths + `srcset`/`sizes` + baked blur over `public/manual/`
  - `auto` — `<Picture>` generates formats, `srcset`, `sizes`, and `width`/`height`
  - `pixel-perfect` — `sizes` computed from layout tokens (`src/features/optimg/lib/sizes.ts`)
  - `skeleton` — `auto` plus a static grey placeholder box (zero bytes, zero decode)
  - `lqip` — `auto` plus a `getImage()` blurred placeholder and a cache-guarded fade
  - `cropped` — `fit=cover` with per-view aspect ratios (4:3 thumb, 16:9 cover)
  - `final` — production stack: LQIP + fade over pixel-perfect token widths + optional crop

### Dataset

`pnpm gen:optimg` builds a deterministic 20-image dataset into
`src/assets/optimg/` (sources) and `public/manual/` (hand-cut widths + blur).
Half the photos are seeded [Picsum](https://picsum.photos) images (committed);
the other half are generated offline with `sharp` (`feTurbulence`, fixed seed)
and are git-ignored — reproduced on demand. `pnpm build` runs `gen:optimg` first.

### Benchmark

`benchmark:optimg` orchestrates `scripts/lighthouse.mjs` (a discarded warmup +
5 measured Lighthouse runs per strategy) and `scripts/measure.mjs` (per-metric
median + LCP min–max spread). It prints a table **and** writes one file per
form-factor — `src/features/optimg/data/benchmark.{mobile,desktop}.json` — which
the `/optimg` hub renders as results tables. Commit the refreshed JSON to update
the on-page numbers.

The comparison is only valid when every strategy is measured on **one deploy**:
the script records each run's Netlify `dpl` id and aborts if runs span more than
one (transform caches were reset mid-benchmark). Run it against the **deployed
Netlify URL** so the Image CDN serves the transforms:

```sh
# full run, one mode at a time (default mode is mobile)
pnpm benchmark:optimg https://astro-jeromeabel.netlify.app mobile
pnpm benchmark:optimg https://astro-jeromeabel.netlify.app desktop
```

**Run a single strategy** (e.g. after adding `skeleton`) without re-measuring the
others — measure it into the same `scripts/lh/<mode>/` dir, then re-aggregate:

```sh
node scripts/lighthouse.mjs skeleton https://astro-jeromeabel.netlify.app mobile
node scripts/lighthouse.mjs skeleton https://astro-jeromeabel.netlify.app desktop
node scripts/measure.mjs mobile    # re-print the table from existing runs
node scripts/measure.mjs desktop
```

⚠️ Caveat: a single-strategy top-up only stays comparable if the **other**
strategies' runs share the same live `dpl`. `measure.mjs` re-prints but does not
re-fetch; `benchmark.mjs` (`benchmark:optimg`) is what writes the JSON, and it
prints a loud cross-strategy `dpl` warning if the runs span more than one deploy —
if the site was redeployed since the last full run, re-run the whole set so all
eight strategies land on one `dpl`.

**Throttling.** Mobile uses `--throttling-method=devtools` (paces the real
network/CPU); desktop uses Lighthouse's `--preset=desktop`. Lantern's simulated
throttling was dropped — it nonlinearly amplifies scheduling jitter for strategies
with longer transform chains, producing a bimodal spread unrelated to real
performance.

**Sharp vs. Netlify Image CDN.** Local `pnpm preview` serves Sharp build-time
transforms; the deployed URL serves the Image CDN per request. The `/_astro/`
files are identical — only the transform timing differs. The committed numbers
come from the deployed URL.
