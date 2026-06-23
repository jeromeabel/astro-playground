# Implementation Plan: `/images` Optimization Page — Review Remediation

**Source spec:** `docs/images-optimization-review.md`
**Date:** 2026-06-23
**Scope:** `src/pages/images/`, `src/components/DemoImage.astro`, `src/lib/`, `astro.config.mjs`

## Overview

The design review filed 4 findings (one critical bug, one required refactor, two
optional cleanups) plus one doc-verified config option. This plan turns them into
ordered, independently-verifiable tasks. The work is a small refactor: restore a
single source of truth for the strategy list, fix a documented-wrong benchmark
command, and remove two real copy-paste sites. No behavior of the rendered images
changes — only the doc text (#1) and the internal structure (#2–#5).

## Architecture Decisions

- **`src/lib/strategies.ts` becomes the single source for the strategy set.**
  Mirrors the existing `lib/sizes.ts` token pattern and the project's
  `gallery.json` single-source philosophy. The `Strategy` union and the
  `STRATEGY_IDS` array are derived from one `STRATEGIES` const so adding an 8th
  strategy is a one-line edit.
- **DemoImage keeps 6 explicit `<Picture>` blocks** (pedagogical value), but shared
  literal props are hoisted to `baseProps` to kill copy-paste without hiding
  per-strategy differences. This is the review's "best of both" recommendation.
- **`import.meta.glob` + `imgOf` lookup moves to `src/lib/demo-images.ts`** so the
  two routes stop duplicating it.
- **Config default `image.layout: "constrained"` is treated as a separate, opt-in
  decision** (Task 6), not bundled into the structural work — it's a global change
  that trades against the playground's "each block is self-documenting" goal.

## Dependency Graph

```
Task 1 (doc fix)            — independent, no deps
Task 2 (lib/strategies.ts)  — foundation
   ├── Task 3 ([strategy]/index.astro uses it)
   ├── Task 4 ([strategy]/[id].astro uses it)
   └── Task 5 (DemoImage imports Strategy type)
Task 4b (lib/demo-images.ts) — independent of #2; consumed by routes in 3 & 4
Task 5 (DemoImage baseProps) — independent of #2 logically; folded with the type import
Task 6 (config image.layout) — optional, separate decision, last
```

Implementation order is bottom-up: ship the foundation (`strategies.ts`,
`demo-images.ts`) before the consumers that import from them.

## Verification Strategy

- **Primary type-check (no network):** `pnpm exec astro check` — validates all
  `.astro`/`.ts` types without running `gen:images` (which needs picsum network).
- **Full build (network-permitting):** `pnpm build` — runs `gen:images` then
  `astro check && astro build`. Use when picsum is reachable.
- **Manual visual check:** `pnpm dev` → load `/images`, click into one strategy
  grid, click into a detail view. Confirm the hub text now reads `netlify serve`
  and all 7 strategy routes still render.

## Task List

### Phase 1: Critical fix

- [ ] **Task 1** — Fix the wrong benchmark command on the hub (#1)

### Checkpoint A: Doc correctness
- [ ] `/images` hub no longer instructs `pnpm preview`; both spots read `netlify serve`.

### Phase 2: Single-source foundation

- [ ] **Task 2** — Create `src/lib/strategies.ts` (#2)
- [ ] **Task 3** — Consume `strategies.ts` in the grid route (#2)
- [ ] **Task 4** — Consume `strategies.ts` in the detail route + hub (#2)

### Checkpoint B: Single source restored
- [ ] `STRATEGIES`/`Strategy` defined once; grep finds no other strategy-union literal.
- [ ] `pnpm exec astro check` passes; all 7 routes still build.

### Phase 3: De-duplication cleanups (optional)

- [ ] **Task 4b** — Extract `src/lib/demo-images.ts` (`imgOf`) (#4)
- [ ] **Task 5** — Hoist `baseProps` in `DemoImage.astro` (#3)

### Checkpoint C: Cleanups landed
- [ ] No duplicated glob/lookup; DemoImage blocks share `baseProps`.
- [ ] `pnpm exec astro check` passes; visual check of LQIP/final fade unchanged.

### Phase 4: Config decision (deferred)

- [ ] **Task 6** — (Decision required) default `image.layout: "constrained"` (#5)

### Checkpoint D: Complete
- [ ] All acceptance criteria met; `pnpm build` clean (network-permitting).
- [ ] Ready for review.

### Phase 5: Served-size verification (DPR-aware)

- [ ] **Task 7** — Audit the file each Image Card actually loads vs slot × DPR
- [ ] **Task 8** — (Conditional) fix the `gridSlot` round-down only if Task 7 finds `✗ short` at integer DPR
- [ ] **Task 9** — (Optional, decision) add a fractional-DPR multiplier to `retina()`
- [ ] **Task 10** — (Opt-in) `?debug` per-card served-size overlay (Task 7 audit as visible UI)

### Checkpoint E: Served size verified
- [ ] Console audit on `/images/final` + `/images/pixel-perfect` prints `✓ covered` for every card at DPR 1 and 2.
- [ ] No `✗ short` at integer DPR; `got ≫ need` at fractional DPR understood as expected over-fetch.
- [ ] `?debug` overlay renders the same verdict per card and is absent without the query param.

---

## Task Detail

### Task 1: Fix the wrong benchmark command on the hub

**Description:** `src/pages/images/index.astro` tells users to run Lighthouse
against `pnpm preview`, which 404s on 5 of 7 strategies (`/.netlify/images` URLs).
Replace both references with the correct `netlify serve` workflow, matching
`CLAUDE.md` and the harness.

**Acceptance criteria:**
- [ ] `index.astro:40` no longer says `pnpm preview` (the intro paragraph).
- [ ] `index.astro:86` empty-state no longer says `pnpm preview`.
- [ ] Text matches the harness: benchmark runs against `netlify serve` (port 8888).

**Verification:**
- [ ] `grep -n "pnpm preview" src/pages/images/index.astro` returns nothing.
- [ ] `pnpm dev` → `/images` intro + empty-state read `netlify serve`.

**Dependencies:** None
**Files likely touched:** `src/pages/images/index.astro`
**Estimated scope:** XS (1 file)

---

### Task 2: Create `src/lib/strategies.ts`

**Description:** Add the single source of truth for the 7-strategy set: a
`STRATEGIES` const of `{ id, title, blurb }`, a derived `Strategy` union type, and
a derived `STRATEGY_IDS` array. Lift the `title`/`blurb` copy verbatim from the
current `index.astro:21-29` objects so the hub renders identically.

**Acceptance criteria:**
- [ ] `STRATEGIES` lists all 7 ids in current order with existing titles + blurbs.
- [ ] `export type Strategy = (typeof STRATEGIES)[number]["id"]`.
- [ ] `export const STRATEGY_IDS` is the id array typed as `Strategy[]`.

**Verification:**
- [ ] `pnpm exec astro check` passes with the new module unreferenced yet.

**Dependencies:** None
**Files likely touched:** `src/lib/strategies.ts` (new)
**Estimated scope:** XS (1 file)

---

### Task 3: Consume `strategies.ts` in the grid route

**Description:** In `src/pages/images/[strategy]/index.astro`, delete the local
`Strategy` union and the inline `as const` array; import `Strategy` +
`STRATEGY_IDS` and map `STRATEGY_IDS` in `getStaticPaths`.

**Acceptance criteria:**
- [ ] No `type Strategy = ...` literal remains in this file.
- [ ] `getStaticPaths` maps `STRATEGY_IDS`.
- [ ] All 7 grid routes still generate.

**Verification:**
- [ ] `pnpm exec astro check` passes.
- [ ] `pnpm dev` → `/images/final` and `/images/naive` grids render.

**Dependencies:** Task 2
**Files likely touched:** `src/pages/images/[strategy]/index.astro`
**Estimated scope:** S (1 file)

---

### Task 4: Consume `strategies.ts` in the detail route + hub

**Description:** Repeat Task 3's substitution in
`src/pages/images/[strategy]/[id].astro` (`getStaticPaths` over `STRATEGY_IDS`),
and replace the hub's inline `strategies` array in `index.astro:21-29` with an
import of `STRATEGIES`.

**Acceptance criteria:**
- [ ] No `type Strategy = ...` literal remains in the detail route.
- [ ] Hub imports `STRATEGIES`; the nav list + links render unchanged.
- [ ] Detail routes for all 7×20 combinations still generate.

**Verification:**
- [ ] `grep -rn 'type Strategy =' src/` returns only nothing (union now lives in lib as `export type`).
- [ ] `pnpm exec astro check` passes.
- [ ] `pnpm dev` → hub list + one detail page render identically.

**Dependencies:** Task 2
**Files likely touched:** `src/pages/images/[strategy]/[id].astro`, `src/pages/images/index.astro`
**Estimated scope:** S (2 files)

---

### Task 4b: Extract `src/lib/demo-images.ts` (optional, #4)

**Description:** Move the duplicated `import.meta.glob<{ default: ImageMetadata }>`
+ `imgOf(id)` lookup (in both routes) into one module exporting `imgOf`. Both
routes import it.

**Acceptance criteria:**
- [ ] `imgOf(id)` lives in `src/lib/demo-images.ts`, returns `ImageMetadata | undefined`.
- [ ] Both routes import it; neither defines the glob inline.
- [ ] `import.meta.glob` still runs at build (eager) — images resolve identically.

**Verification:**
- [ ] `grep -rn "import.meta.glob" src/pages/images` returns nothing.
- [ ] `pnpm exec astro check` passes; thumbs + cover images render in `pnpm dev`.

**Dependencies:** Tasks 3, 4 (so the route edits don't collide)
**Files likely touched:** `src/lib/demo-images.ts` (new), both image routes
**Estimated scope:** S (3 files)

---

### Task 5: Hoist `baseProps` in `DemoImage.astro` (optional, #3)

**Description:** Keep the 6 explicit `<Picture>` blocks, but extract the shared
literal props (`formats`, `layout`, `loading`, `fetchpriority`, `alt`, `class`)
into a `baseProps` object spread into each block. Per-strategy differences
(`widths`, `sizes`, `fit`, `position`, `width`, `height`, `pictureAttributes`)
stay explicit. Also switch the `Props.strategy` union to import `Strategy` from
`lib/strategies.ts`.

**Acceptance criteria:**
- [ ] `baseProps` defined once; each `<Picture>` spreads it.
- [ ] Per-strategy props remain inline and readable (no computed-props collapse).
- [ ] `Props.strategy` uses the imported `Strategy` type.

**Verification:**
- [ ] `pnpm exec astro check` passes.
- [ ] `pnpm dev` → LQIP + final fade-in still works; all strategies render.

**Dependencies:** Task 2 (for the `Strategy` import)
**Files likely touched:** `src/components/DemoImage.astro`
**Estimated scope:** S (1 file)

---

### Task 6: Default `image.layout: "constrained"` (DECISION REQUIRED, #5)

**Description:** Doc-verified option: set `image.layout: "constrained"` in
`astro.config.mjs` so every `<Picture>` in `DemoImage` can drop the repeated
`layout="constrained"` prop (cropped/final keep explicit `fit`/`position`). This
is a global default that weakens each block's self-documenting quality — it is a
trade-off, not a clear win. **Do not implement without a human decision.**

**Acceptance criteria (if approved):**
- [ ] `astro.config.mjs` `image.layout = "constrained"`.
- [ ] `DemoImage` blocks drop the redundant `layout` prop; rendering unchanged.

**Verification:**
- [ ] `pnpm build` (network-permitting) clean; benchmark/visual output unchanged.

**Dependencies:** Task 5
**Files likely touched:** `astro.config.mjs`, `src/components/DemoImage.astro`
**Estimated scope:** S (2 files)

---

### Task 7: Audit the served file per Image Card (DPR-aware, spec §"Verifying the served size")

**Description:** The pixel-perfect/final cards can render at a 229px slot yet load
a 704px file and still be correct (the browser picks by density, not rendered px).
Run the spec's console audit to confirm every card loads a file that *covers*
`slot × devicePixelRatio` without upscaling — and to catch a real `✗ short` bug if
the srcset under-serves.

**Acceptance criteria:**
- [ ] Run the spec snippet on `/images/final` and `/images/pixel-perfect`.
- [ ] Every card prints `✓ covered` at DPR 1 and DPR 2 (browser zoom 100% + 200%, or `--force-device-scale-factor`).
- [ ] `got ≫ need` at fractional DPR (the 704 case) is recorded as expected, not a bug.

**Verification:**
- [ ] No `✗ short` line at integer DPR. Any `✗ short` escalates to Task 8.

**Dependencies:** None (diagnostic-only; pairs with the rendered `/images` build)
**Files likely touched:** none (read-only audit) — findings drive Task 8/9
**Estimated scope:** XS

---

### Task 8: Fix `gridSlot` round-down (CONDITIONAL — only if Task 7 finds `✗ short` at integer DPR)

**Description:** `gridSlot(3)` does `Math.round(229.33) → 229`, dropping 0.33px.
The 2× retina candidate is then `458`, fractionally below the true device
requirement `229.33 × 2 = 458.66`, so a DPR-2 browser can step up to the coarser
`704` candidate instead of landing on the slot. Only act if Task 7 actually
observes `✗ short` (or a measurable upgrade) at integer DPR — otherwise the
round-down is cosmetic and the 704 is purely a fractional-DPR effect.

**Acceptance criteria (if triggered):**
- [ ] Slot/`widths` math no longer rounds the 3-col slot below its true CSS px (e.g. `Math.ceil` the slot, or `ceil` the retina product).
- [ ] `pixelPerfectGridWidths` carries a candidate ≥ `ceil(slot × 2)` for the 3-col slot.
- [ ] No other slot (`gridMd` 352, `cover` 720 — both integers) changes.

**Verification:**
- [ ] Re-run the Task 7 audit → all `✓ covered`, `got` close to `need` at DPR 2.
- [ ] `pnpm exec astro check` passes; benchmark numbers unchanged or improved.

**Dependencies:** Task 7 (only runs if Task 7 fails)
**Files likely touched:** `src/lib/sizes.ts`
**Estimated scope:** S (1 file)

---

### Task 9: Fractional-DPR multiplier in `retina()` (OPTIONAL — decision required, spec §"If exactness at fractional DPR is a goal")

**Description:** Today files land 1:1 only at DPR 1 and 2; at fractional DPR the
browser over-fetches one density rung (the 704 case). To land exactly on a *known*
fractional DPR, add that multiplier to `retina()` in `lib/sizes.ts` (e.g.
`gridLg × 2.5`). The spec recommends **against** this — you can't enumerate every
client's DPR, the teaching point survives, and one rung of over-fetch is the right
trade. Listed for completeness; do not implement without a decision.

**Acceptance criteria (if approved):**
- [ ] `retina()` emits the chosen fractional multiplier; srcset grows by exactly those candidates.
- [ ] Task 7 audit at the target DPR shows `got` == `need` (exact).

**Verification:**
- [ ] `pnpm exec astro check` passes; srcset bloat is bounded to the approved multipliers.

**Dependencies:** Task 7 (motivation), Task 8 (if landed)
**Files likely touched:** `src/lib/sizes.ts`
**Estimated scope:** S (1 file)

---

### Task 10: `?debug` served-size overlay (OPT-IN, spec §"Verifying the served size")

**Description:** Promote the Task 7 console audit to a visible, teaching-grade UI:
a per-card badge that shows the file each Image Card actually loaded vs the slot ×
DPR requirement, updating live as the viewport/DPR changes. Makes the density-
selection model observable — resize the window and watch the chosen candidate flip
229 → 458 → 704 across breakpoints. **Strictly opt-in** so it never enters the
measured Lighthouse path.

**Acceptance criteria:**
- [ ] Gated on a `?debug` query param (or a hub checkbox that sets it) — absent by default.
- [ ] New `src/scripts/img-audit.ts` reuses the audit logic: `getBoundingClientRect().width`, `devicePixelRatio`, `currentSrc` `w` param.
- [ ] Per-card badge renders `slot N · DPR x · got Nw · <verdict>` where verdict is `✓` covered / `✗` short / `≫` over-fetch.
- [ ] Re-runs on `resize` (DPR + viewport changes shift the chosen candidate).
- [ ] `naive`/`manual` cards (no `w` descriptor) fall back to `naturalWidth` and are labelled "no srcset" — itself a teaching signal.
- [ ] With no `?debug`, no extra DOM or script runs (zero LCP/bytes impact).

**Verification:**
- [ ] `/images/final?debug` shows a badge per card matching the console audit; `/images/final` shows none.
- [ ] Resize across the md/lg breakpoints flips the badge values; `pnpm exec astro check` passes.
- [ ] Lighthouse run (no `?debug`) numbers unchanged from pre-Task-10 baseline.

**Dependencies:** Task 7 (shared audit logic)
**Files likely touched:** `src/scripts/img-audit.ts` (new), `src/components/DemoImage.astro` (badge slot), the grid route or hub (param wiring)
**Estimated scope:** S (2–3 files, ~30 lines + badge style)

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `pnpm build` needs picsum network for `gen:images` | Med | Use `pnpm exec astro check` as primary type-check; full build only when online |
| `as const` array → `Strategy` union type drift if titles edited | Low | Derive union from const; never hand-write the union again |
| baseProps hoist accidentally changes per-strategy behavior | Med | Only hoist truly-identical literals; keep widths/sizes/fit inline; visual check LQIP fade |
| Route edits in #3/#4 + #4b collide | Low | Sequence #4b after #3/#4 |
| `704` served at fractional DPR misread as a bug | Low | Task 7 audit + spec density model: `got ≫ need` is correct over-fetch, not upscaling |
| `gridSlot` round-down silently upscales at integer DPR | Med | Task 7 catches `✗ short`; Task 8 ceils the slot only if observed |
| `?debug` overlay leaks into Lighthouse path → skews LCP/bytes | Med | Strictly query-param gated; benchmark always runs the bare URL; Task 10 verify asserts no DOM without `?debug` |

## Open Questions

- **Task 6:** Adopt the global `image.layout` default, or keep `layout="constrained"`
  explicit on each block for teaching clarity? Needs a human call.
- Should the optional Phase 3 cleanups (#3/#4) ship in the same PR as #1/#2, or a
  follow-up? Default assumption: same PR unless told otherwise.
- **Task 9:** Worth adding a fractional-DPR multiplier to `retina()`, or leave the
  1×/2× candidates and accept one rung of over-fetch at fractional DPR? Default: leave.
