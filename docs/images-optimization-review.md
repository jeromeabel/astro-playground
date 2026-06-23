# Design Review — `/images` Optimization Page

**Date:** 2026-06-23
**Scope:** `src/pages/images/` and its optimization dependencies
(`DemoImage.astro`, `lib/sizes.ts`, `scripts/reveal-img.ts`, `data/gallery.ts`).
**Method:** Five-axis review (correctness, readability, architecture, security,
performance) cross-checked against official Astro docs via Context7 MCP
(`/withastro/docs`).

---

## Files Reviewed

| File | Lines | Role |
|------|-------|------|
| `src/pages/images/index.astro` | 95 | Hub: strategy list + benchmark table |
| `src/pages/images/[strategy]/index.astro` | 43 | Grid route (20-image gallery) |
| `src/pages/images/[strategy]/[id].astro` | 45 | Detail route (LCP cover) |
| `src/components/DemoImage.astro` | 200 | Per-strategy renderer (7 branches) |
| `src/lib/sizes.ts` | 63 | Layout tokens → `sizes` + pixel-perfect `widths` |
| `src/scripts/reveal-img.ts` | 33 | LQIP cache-guarded fade |
| `src/data/gallery.ts` | 16 | Typed `gallery.json` accessor |

**Verdict: Request changes** — findings #1 and #2 before merge. #3/#4 improve
health but are not blockers.

---

## Findings (ordered by leverage)

### #1 — Critical: hub documents the wrong benchmark command

`index.astro:40` and `index.astro:86` instruct users to run Lighthouse against
`pnpm preview`. This contradicts the harness and `CLAUDE.md`:

> `auto`, `pixel-perfect`, `lqip`, `cropped`, and `final` emit
> `/.netlify/images?...` URLs that **404 on the plain preview server**, skewing
> results. Must use `netlify serve` (port 8888).

The page teaches the wrong command for 5 of the 7 strategies it documents.

**Fix:** replace both `pnpm preview` references with `netlify serve`.

---

### #2 — Required: strategy list + `Strategy` union duplicated 4×

The 7-strategy definition is repeated across:

- `[strategy]/index.astro:7,10` — type union + `as const` array
- `[strategy]/[id].astro:7,10` — identical union + array
- `DemoImage.astro:18` — union again
- `index.astro:21-29` — hub objects (id + title + blurb)

Adding an 8th strategy means editing 4 files; drift is inevitable. This is the
missing-single-source smell — ironic given `gallery.json` is the project's
celebrated single source of truth for the dataset.

**Remedy:** `src/lib/strategies.ts` as the one source.

```ts
// src/lib/strategies.ts
export const STRATEGIES = [
  { id: "naive", title: "Naive", blurb: "Plain <img>, full-size…" },
  { id: "manual", title: "Manual", blurb: "Hand-cut widths + srcset…" },
  { id: "auto", title: "Auto", blurb: "<Picture> generates formats…" },
  { id: "pixel-perfect", title: "Pixel-perfect", blurb: "sizes from tokens…" },
  { id: "lqip", title: "LQIP", blurb: "Auto + blurred placeholder…" },
  { id: "cropped", title: "Cropped", blurb: "fit=cover per-view ratios…" },
  { id: "final", title: "Final", blurb: "The production stack…" },
] as const;

export type Strategy = (typeof STRATEGIES)[number]["id"];
export const STRATEGY_IDS = STRATEGIES.map((s) => s.id) as Strategy[];
```

- Routes: `getStaticPaths` maps `STRATEGY_IDS`.
- Hub: renders `STRATEGIES` objects it already needs.
- `DemoImage`: imports `Strategy`.

Mirrors the existing `lib/sizes.ts` token pattern.

---

### #3 — Consider: `DemoImage.astro` duplication (with a real tension)

200 lines, 6 near-duplicate `<Picture>` blocks. `formats` / `layout` /
`loading` / `fetchpriority` / `alt` / `class` repeat 6×; `final` ≈ `lqip` +
pixel-perfect `widths` + crop; `lqip` ≈ `auto` wrapped in a reveal container.

**Tension:** this file's *purpose* is pedagogical — showing each strategy as a
distinct, readable block side-by-side is the teaching value. A clever collapse
into one computed-props `<Picture>` trades that away.

**Recommendation (best of both):** keep the 6 explicit blocks, but extract the
shared literal props to kill copy-paste without hiding per-strategy differences:

```astro
const baseProps = {
  formats: ["avif", "webp"] as const,
  layout: "constrained" as const,
  loading, fetchpriority, alt: item.alt, class: "block w-full",
};
// <Picture src={image} {...baseProps} width={ppWidth} widths={ppWidths} sizes={ppSizes} />
```

---

### #4 — Optional: `import.meta.glob` + `imgOf` duplicated in both routes

`[strategy]/index.astro:16-20` and `[strategy]/[id].astro:19-23` repeat the
identical glob pattern and lookup helper.

**Remedy:** `src/lib/demo-images.ts` exporting `imgOf(id)`. Small, removes a
real copy.

---

### Nits / FYI

- **Nit:** `gallery.ts:16` and `index.astro:17` use `as unknown as` double-casts
  on JSON imports — papers over the boundary. Low priority.
- **FYI:** `reveal-img.ts` is imported on every strategy route, including
  `naive`/`auto`/`cropped` that have no `.reveal-img`. Harmless (empty
  `querySelectorAll`).
- **FYI:** `Astro.params.strategy as Strategy` is an unchecked cast, but
  `getStaticPaths` guarantees the value at build — fine for a static route.
- **FYI (already documented):** `pixelPerfectGridWidths` max is 704, but a `<md`
  single-column slot can reach ~720 CSS px → 1440 @2x, so the largest
  mobile/retina case can't land exactly. `sizes.ts:28` already calls this
  "best-effort."

---

## Verifying the served size on Image Cards (DPR-aware)

**Question:** how do I know the *exact* file an Image Card loads, and whether it's
the right one? A card can render at a 229px slot yet download a 704px file and
still be correct — this section is the model + the diagnostic.

### Selection model

The browser does **not** pick from `srcset` by rendered px. It picks by *density*:

1. **Source size** = the CSS px the `sizes` attribute resolves to at the current
   viewport (not the actual rendered box). For the 3-col final grid:
   `(min-width:1024px) 229px` → source size **229px**.
2. **Candidate density** = `descriptorW / sourceSize`. From the emitted srcset
   `229 / 352 / 458 / 704`:

   | candidate | density vs 229px slot | origin |
   |-----------|----------------------|--------|
   | `229w` | 1.00× | gridLg 1× |
   | `352w` | 1.54× | gridMd 1× (other breakpoint) |
   | `458w` | 2.00× | gridLg 2× (exact retina) |
   | `704w` | 3.07× | gridMd 2×, reused as next density step |

3. Browser loads the **smallest candidate whose density ≥ `devicePixelRatio`**.

So `DPR 2.0` → `458w` (exact). `DPR > 2.0` (fractional display scaling on Linux,
or browser page-zoom) → `458` is insufficient, browser steps up to `704`. **Both
are correct.** `704` is simply the 2-col slot's 2× reused as the nearest density
rung; no exact 3-col candidate exists for fractional DPR by design (`widths`
enumerates only 1×/2× of the two grid slots — see the `<md` FYI above).

### Diagnostic — audit every card from the console

Paste on any `/images/<strategy>` grid page. Prints slot, DPR, the file actually
served, and whether it covers the device requirement:

```js
for (const img of document.querySelectorAll('.reveal-img img:not([aria-hidden]), img.block.w-full')) {
  const slot = img.getBoundingClientRect().width;
  const need = Math.ceil(slot * devicePixelRatio);
  const got  = +new URL(img.currentSrc, location.href).searchParams.get('w') || img.naturalWidth;
  console.log(
    `slot ${slot.toFixed(1)}px × DPR ${devicePixelRatio} → need ≥${need}w · got ${got}w`,
    got >= need ? '✓ covered' : '✗ upscaled (short)',
  );
}
```

- `✓ covered` + `got` close to `need` = pixel-perfect (no resampling).
- `✓ covered` + `got ≫ need` = a coarser density rung was chosen (the 704 case);
  correct, mildly over-fetched. Expected at fractional DPR.
- `✗ short` = the file is below device need and the browser will upscale — a real
  bug. On `pixel-perfect`/`final` this should never fire at integer DPR; if it
  does, suspect the `Math.round(229.33)→229` drop in `gridSlot` (the `458`
  candidate then falls fractionally below the true `458.66` requirement).

### If exactness at fractional DPR is a goal (optional)

Today the file lands 1:1 only at DPR 1 and 2. To cover a known fractional DPR,
add that multiplier to `retina()` in `lib/sizes.ts` (e.g. emit `gridLg * 2.5`).
Not recommended for the playground — you can't enumerate every client's DPR, and
the teaching point (file lands on the slot at 1×/2×) stays intact. Over-fetching
one density rung is the right trade.

---

## Axis Summary

- **Correctness:** one real bug (#1, wrong benchmark command). Aspect-ratio math,
  crop dimensions, LQIP placeholder aspect, and CLS reservation all check out.
- **Readability:** #2 (4× duplication) and #3 (block duplication) are the levers.
- **Architecture:** #2 is the structural finding — restore single-source.
- **Security:** clean. Static site, no user input; `rel="noopener noreferrer"`
  present on external author links; gallery data is committed/trusted.
- **Performance:** clean. Lazy thumbs, eager + `fetchpriority="high"` cover LCP,
  build-time `import.meta.glob`, width/height reserve space → no CLS.

---

## Astro Doc Cross-Check (Context7 `/withastro/docs`)

The current implementation is doc-aligned. Verified points:

1. **`<Picture>` accepts all `<Image>` props** (`widths`, `sizes`, `fit`,
   `position`, `layout`, `pictureAttributes`). Usage in `DemoImage` is correct.
2. **`widths` requires `sizes`.** Both supplied on `pixel-perfect`/`final`. ✓
3. **Retina via `widths`, not `densities`** — docs state `densities` is
   **incompatible with `layout`** (and with `widths`). Because the project uses
   `layout="constrained"`, the custom `retina()` helper (emit each slot at 1x +
   2x as explicit `widths`) is the doc-sanctioned path. Switching to `densities`
   would be wrong here.
4. **`layout="constrained"`** → `max-width:100%`, scales down not up. Matches the
   intent of the grid/cover slots.
5. **`image.responsiveStyles: true`** injects `:where([data-astro-image])` rules
   using `--fit` / `--pos` CSS vars. Confirms `CLAUDE.md`'s note that Tailwind
   utilities (in a cascade layer) lose to these unlayered styles — so
   `fit`/`position` must be set via component props, not Tailwind classes.

### Doc-verified optional improvement

- **Set `image.layout: "constrained"` in `astro.config.mjs`** as the default.
  Docs: the `layout` prop overrides `image.layout`. Configuring the default lets
  every `<Picture>` in `DemoImage` drop the repeated `layout="constrained"` prop
  (cropped/final keep explicit `fit`/`position`). Minor DRY win, but global —
  weigh against the playground's "each block is self-documenting" goal.

---

## Suggested Sequence

1. Fix #1 (one-line doc correctness bug).
2. Land #2 (`lib/strategies.ts`) — highest structural leverage.
3. Optionally #4 (`lib/demo-images.ts`) and #3 (`baseProps`) as a cleanup pass.
4. Leave #5 (config `image.layout`) for a separate decision — global default vs.
   per-block explicitness.
