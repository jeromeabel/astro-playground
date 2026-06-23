# Design — DemoImage Component Architecture

**Date:** 2026-06-24
**Status:** Approved (pending spec review)
**Scope:** `src/components/` (DemoImage + per-strategy leaves), `src/lib/`, `src/pages/images/`, vitest setup.
**Supersedes:** `tasks/plan.md` Task 5; reshapes Tasks 3/4/4b. Folds in Task 1 (doc fix) and the Task 6 config decision.

---

## Problem

`src/components/DemoImage.astro` is a 200-line component with a 7-branch `if`
ladder (one per optimization strategy). Two kinds of duplication are tangled
together inside it:

1. **Logic** — placeholder aspect math, crop ratio→height, `sizes`/`widths`
   selection, manual `srcset` strings. This is the bug-prone part; every past
   regression on this page (e.g. 718×478 vs 750×500, border-token miscalc) was
   *dimension math*, not markup.
2. **Markup** — the `<Picture>`/`<img>` blocks themselves, which are the
   *pedagogical payload* of this teaching page: each strategy should read as a
   distinct, explicit block side by side.

The goal is a declarative component architecture that **shares the logic
(testable, in `.ts`) while keeping each strategy's markup explicit**.

## Quality Standards (this use case)

`/images` is a teaching playground. Ranked:

1. **Pedagogical legibility** — each strategy readable as one self-contained,
   explicit block. The markup *is* the lesson.
2. **Single source of truth** — shared facts (formats, sizes tokens, placeholder
   math, strategy list) defined once. Drift teaches the wrong thing.
3. **Honest composition** — `final = lqip + pixel-perfect + crop` should be
   visible in code structure.
4. **Astro-idiomatic** — `<Picture>` props live at one call site; boundaries
   don't fight the framework.
5. **Low edit-cost** — adding a strategy is additive (new file + registry line),
   never switch surgery.
6. **Testability** — the bug-prone math is unit-tested.

## Approach (decided)

**Flat leaf-per-strategy components on tested pure-`.ts` logic**, with a thin
dispatcher and one shared markup wrapper.

Considered and rejected:
- **Pure decorators (`CustomImageWith*` nested wrappers):** fights Astro —
  `<Picture>` needs its props at one call site; threading widths/sizes/fit
  through nested slots *hides* the per-strategy diff (violates standards 1 & 3).
- **Component primitives (`ResponsivePicture` core):** would hide the `<Picture>`
  props that are the lesson; adds a component hop. Logic-in-`.ts` gives the same
  DRY win without obscuring markup.
- **Flat leaves with no shared logic:** re-duplicates the bug-prone math across 7
  files (violates standards 2 & 6).

The chosen split: **logic → `lib/*.ts` (tested); markup → leaf component
(explicit).**

## Architecture

```
src/
  components/
    DemoImage.astro          # thin dispatcher: strategy -> leaf via registry map
    RevealFade.astro         # shared wrapper: reveal-img div + blur placeholder + <slot/>
    NaiveImage.astro         # 7 flat leaves (markup explicit, import only what they need)
    ManualImage.astro
    AutoImage.astro
    PixelPerfectImage.astro
    LqipImage.astro
    CroppedImage.astro
    FinalImage.astro
  lib/
    sizes.ts        (exists) # slot/retina/widths math
    strategies.ts   (new)    # STRATEGIES, Strategy, STRATEGY_IDS
    crop.ts         (new)    # ASPECT ratios + cropHeight(width, ratio)
    placeholder.ts  (new)    # placeholderDims(ratio) [pure] + buildPlaceholder() [getImage glue]
    manual-srcset.ts(new)    # manualSrc(id, w) + manualSrcset(id, widths)
    demo-images.ts  (new)    # imgOf(id)
    *.test.ts                # vitest units on the pure math
```

All leaves live **flat** in `src/components/` (no subfolder).

### Dispatcher — `DemoImage.astro`

Keeps the existing route-facing interface; replaces the 7-branch ladder with a
registry lookup and dynamic component render:

```astro
---
import type { ImageMetadata } from "astro";
import type { GalleryItem } from "../data/gallery";
import type { Strategy } from "../lib/strategies";
import Naive from "./NaiveImage.astro";
import Manual from "./ManualImage.astro";
import Auto from "./AutoImage.astro";
import PixelPerfect from "./PixelPerfectImage.astro";
import Lqip from "./LqipImage.astro";
import Cropped from "./CroppedImage.astro";
import Final from "./FinalImage.astro";

interface Props {
  item: GalleryItem;
  strategy: Strategy;
  type: "thumb" | "cover";
  image?: ImageMetadata;
}
const { item, strategy, type, image } = Astro.props;

const registry: Record<Strategy, typeof Naive> = {
  naive: Naive, manual: Manual, auto: Auto,
  "pixel-perfect": PixelPerfect, lqip: Lqip, cropped: Cropped, final: Final,
};
const Cmp = registry[strategy];
---
<Cmp {item} {type} {image} />
```

### Shared wrapper — `RevealFade.astro`

The only non-teaching boilerplate shared by `lqip` + `final`:

```astro
---
interface Props { placeholder?: string }
const { placeholder } = Astro.props;
---
<div class="reveal-img relative overflow-hidden">
  <img
    class="absolute inset-0 -z-10 h-full w-full object-cover blur-2xl"
    aria-hidden="true"
    src={placeholder}
    alt=""
  />
  <slot />
</div>
```

The `opacity:0` fade stays on each leaf's `<Picture>` (`pictureAttributes`) — it
is a per-strategy detail, kept explicit.

### Leaf component contract

Every leaf takes the same props as the dispatcher minus `strategy`:

```ts
interface Props {
  item: GalleryItem;
  type: "thumb" | "cover";
  image?: ImageMetadata; // required for all leaves except ManualImage
}
```

Each leaf computes `isCover`/`loading`/`fetchpriority`/`width`/`height` from
`type` (a 6-line shared preamble — accepted as explicit repetition, since it is
the teaching context for each block), then renders its own `<img>`/`<Picture>`.
Leaves import only the `lib/*` helpers they need:

- `NaiveImage` — bare `<img src>`, no helpers.
- `ManualImage` — `manualSrc`/`manualSrcset` + `gridSizes`/`detailSizes`.
- `AutoImage` — `gridSizes`/`detailSizes`.
- `PixelPerfectImage` — `pixelPerfect*` widths/sizes.
- `CroppedImage` — `ASPECT`/`cropHeight` (derives the current fixed 1280×720 /
  640×480 — parity-preserving) + `gridSizes`/`detailSizes`.
- `LqipImage` — `RevealFade` + `buildPlaceholder` + auto sizes.
- `FinalImage` — `RevealFade` + `buildPlaceholder` + `pixelPerfect*` + `ASPECT`/
  `cropHeight` (crop opt-in via `item.crop`).

## Logic Modules + Tests

| Module | Pure fn (unit-tested) | Glue (integration only) |
|---|---|---|
| `strategies.ts` | `STRATEGIES`, `Strategy`, `STRATEGY_IDS` | — |
| `crop.ts` | `ASPECT` const, `cropHeight(w,[rw,rh])` | — |
| `placeholder.ts` | `placeholderDims([aw,ah], base=32)` | `buildPlaceholder(image, ratio)` → `getImage` |
| `manual-srcset.ts` | `manualSrc(id,w)`, `manualSrcset(id,widths)` | — |
| `sizes.ts` (exists) | slot math, `retina`, `pixelPerfect*` | — |
| `demo-images.ts` | — | `imgOf(id)` (`import.meta.glob`, build-time) |

### `strategies.ts` (single source — review finding #2)

```ts
export const STRATEGIES = [
  { id: "naive", title: "Naive", blurb: "<verbatim from index.astro:22>" },
  // ...manual, auto, pixel-perfect, lqip, cropped, final — copy current blurbs
] as const;
export type Strategy = (typeof STRATEGIES)[number]["id"];
export const STRATEGY_IDS = STRATEGIES.map((s) => s.id) as Strategy[];
```

Consumed by: both routes' `getStaticPaths` (`STRATEGY_IDS`), the hub list
(`STRATEGIES`), the dispatcher `registry` keys, and every leaf/dispatcher
`Strategy` type. Removes the union literal currently duplicated 4×.

### `placeholder.ts`

```ts
import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";

// pure — unit-tested
export function placeholderDims([aw, ah]: readonly [number, number], base = 32) {
  return { width: base, height: Math.round((base * ah) / aw) };
}

// glue — integration only (needs Astro asset runtime)
export async function buildPlaceholder(
  image: ImageMetadata,
  ratio: readonly [number, number],
  crop = false,
) {
  const { width, height } = placeholderDims(ratio);
  const img = await getImage({
    src: image, width, height, format: "webp",
    ...(crop ? { fit: "cover" } : {}),
  });
  return img.src;
}
```

### Vitest

- Add `vitest` (devDependency) + `"test": "vitest run"` and
  `"test:watch": "vitest"` scripts. No config file needed for plain TS in
  `src/lib`; add a minimal `vitest.config.ts` only if module resolution requires.
- Tests colocated as `src/lib/<name>.test.ts`.
- Assertions cover the regressions that actually bit:
  - `pixelPerfectGridWidths` deep-equals `[229, 352, 458, 704]`.
  - `pixelPerfectCoverWidths` deep-equals `[720, 1440]`.
  - `cropHeight(720, [16, 9]) === 405`, `cropHeight(640, [4, 3]) === 480`.
  - `placeholderDims([3, 2])` → `{ width: 32, height: 21 }`;
    `placeholderDims([16, 9])` → `{ width: 32, height: 18 }`.
  - `manualSrcset("photo-01", [640, 960, 1280, 1920])` exact string.
  - `STRATEGY_IDS.length === 7` and matches the route/registry key set.
- `getImage`-backed `buildPlaceholder`, `imgOf`, and `.astro` rendering are NOT
  unit-tested (need the Astro runtime); covered by `astro build` + manual check.

## Data Flow

```
getStaticPaths (STRATEGY_IDS × gallery)
  -> route renders <DemoImage item strategy type image>
       -> registry[strategy] = Cmp
       -> <Cmp item type image>
            -> lib/* helpers (sizes/crop/placeholder/manual-srcset)
            -> RevealFade wrapper (lqip/final only)
```

Static build, no runtime branching cost. `imgOf(id)` runs at build via
`import.meta.glob({ eager: true })`.

## Error Handling

- Static site, no user input — minimal.
- `image?` stays optional: `ManualImage` renders from `public/manual/` paths and
  needs no `ImageMetadata`; all other leaves keep an `image &&` guard (current
  behavior preserved).
- `registry[strategy]` cannot miss: `Strategy` union ⟺ `STRATEGY_IDS` ⟺ registry
  keys are the same single source; `getStaticPaths` only emits valid strategies.
  TypeScript `Record<Strategy, …>` enforces exhaustiveness at build.

## Behavior Parity (must not change)

Rendered output of all 7 strategies, both `thumb` and `cover`, must be
byte-equivalent to today (same `<Picture>`/`<img>` attributes, same widths/sizes,
same LQIP fade). This refactor is structural only. Verified by visual check +
`astro build` + (optionally) a benchmark re-run showing unchanged LCP/CLS/bytes.

## Folded-in Review Findings

- **#1 (critical):** `index.astro:40` and `:86` — replace `pnpm preview` with the
  `netlify serve` benchmark workflow.
- **#2 (required):** `strategies.ts` single source (above).
- **#4 (optional):** `demo-images.ts` (`imgOf`) — both routes import it.
- **#3 (`baseProps`):** obsolete — superseded by this architecture.
- **#5 (config `image.layout`):** **Rejected.** Keep `layout="constrained"`
  explicit on every `<Picture>`. Rationale: grid-aware sizing lives in
  `lib/sizes.ts` (explicit `sizes` + `widths`), fully independent of `layout` —
  `layout` only sets CSS (`max-width:100%`) and a fallback auto-`sizes` that is
  grid-blind and deliberately overridden. A global default would (a) hide a
  teaching signal (the `auto` block showing `layout="constrained"` is the lesson),
  (b) affect only 5 of 7 strategies (naive/manual are raw `<img>`), and (c) force
  future full-width demos to override an implicit default. Net: cosmetic DRY win
  not worth the lost explicitness on a teaching page.

## Out of Scope

- Changing image *output* (formats, widths, crop ratios, dataset).
- The `gen-images.mjs` generator and `gallery.json`.
- Adopting `image.layout: "constrained"` as a global default (review #5).

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Dynamic `<Cmp>` render unsupported / mistyped | Med | Astro supports capitalized dynamic tags; `Record<Strategy, typeof Naive>` typed; verify with `astro check` + render of all 7 |
| Behavior drift during extraction | Med | Parity gate: visual check all 7 × thumb/cover + `astro build`; keep attributes identical |
| `vitest` + Astro/Vite config friction | Low | Plain TS modules, relative imports; add `vitest.config.ts` only if resolution needs it |
| `astro check` can't run full build offline (gen:images needs picsum) | Low | Use `pnpm exec astro check` for types; full `pnpm build` when online |

## Open Questions

None. Review #5 resolved above (keep `layout="constrained"` explicit).

### Note: `layout` vs. grid-aware `sizes`

`layout` does not adapt `sizes` to the 3-col / 2-col / 1-col grid — its
auto-generated `sizes` is derived from the `width` prop + viewport and is
grid-blind. The 3/2/1-column adaptation comes entirely from the explicit
`sizes` + `widths` in `lib/sizes.ts` (e.g. `pixelPerfectGridSizes` →
`(min-width:1024px) 229px, (min-width:768px) 352px, calc(100vw - 48px)`), which
overrides layout's auto guess. `auto`/`lqip` use the coarser approximate
`gridSizes`; the gap between approximate and exact is the lesson of the page.
