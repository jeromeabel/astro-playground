# TODO: `/images` Review Remediation

Spec: `docs/images-optimization-review.md` · Plan: `tasks/plan.md`

## Phase 1 — Critical fix
- [x] **Task 1** (#1, XS) — `index.astro`: replace both `pnpm preview` → `netlify serve`
  - AC: `grep -n "pnpm preview" src/pages/images/index.astro` empty ✓
  - Verify: `pnpm dev` → `/images` intro + empty-state read `netlify serve`

### ✅ Checkpoint A — doc correct

## Phase 2 — Single-source foundation
- [x] **Task 2** (#2, XS) — new `src/lib/strategies.ts`: `STRATEGIES`, `Strategy`, `STRATEGY_IDS`
  - Verify: `pnpm exec astro check` ✓ (0 errors)
- [x] **Task 3** (#2, S) — grid route `[strategy]/index.astro` consumes `STRATEGY_IDS` (dep: T2)
- [x] **Task 4** (#2, S) — detail route `[strategy]/[id].astro` + hub `index.astro` consume it (dep: T2)

### ✅ Checkpoint B — single source restored
- [x] `grep -rn 'type Strategy =' src/pages` empty ✓ · `pnpm exec astro check` passes ✓ · 7 routes build

## Phase 3 — De-dup cleanups (optional)
- [x] **Task 4b** (#4, S) — new `src/lib/demo-images.ts` (`imgOf`); both routes import (dep: T3, T4)
  - Verify: `grep -rn "import.meta.glob" src/pages/images` empty ✓
- [x] **Task 5** (#3, S) — `DemoImage.astro`: hoist `baseProps`; import `Strategy` type (dep: T2)
  - Note: `layout` kept INLINE per block — it's the `<Picture>` prop-union discriminant;
    spreading it widened props (loading→string) and broke union selection. baseProps
    carries an explicit type annotation to keep loading/fetchpriority literal.
  - Verify: LQIP + final fade — pending `pnpm dev` visual check

### ✅ Checkpoint C — cleanups landed (committed 3e56ab8)

## Phase 4 — Config decision (deferred)
- [x] **Task 6** (#5, S) — DECISION: **keep `layout="constrained"` explicit** (no change).
  Per-block self-documenting + required inline as the discriminant. Not adopting global default.

### ✅ Checkpoint D — complete, ready for review

## Phase 5 — Served-size verification (DPR-aware)
Spec: review "Verifying the served size on Image Cards (DPR-aware)"
- [ ] **Task 7** (XS) — run the doc's console audit on `/images/final` + `/images/pixel-perfect`
  - AC: every card prints `✓ covered`; no `✗ short` at integer DPR (run at DPR 1 + 2)
  - Note: `got ≫ need` (704 case) at fractional DPR is expected/correct — over-fetch one density rung
- [ ] **Task 8** (S, conditional) — only if Task 7 logs `✗ short` at integer DPR
  - Fix `gridSlot` `Math.round(229.33)→229` drop → 458 candidate falls below true 458.66 @2x
  - Verify: re-run Task 7 audit → all `✓ covered`
- [x] **Task 9** (S, optional/DECISION) — DECISION: **leave 1×/2× candidates** (no change).
  Can't enumerate every client DPR; one rung of over-fetch at fractional DPR is the right trade.
- [x] **Task 10** (S, opt-in) — `?debug` per-card overlay: visible served-size badge (committed 3676e99)
  - New `src/scripts/img-audit.ts`; badge `slot · DPR · got Nw · ✓/✗/≫`; re-runs on `load`+`resize`
  - AC: off by default — chunk code-split behind `?debug` guard; bare URL fetches nothing ✓
  - AC: `naive`/`manual` (no `w` param) labelled "no srcset" via `naturalWidth` fallback ✓
  - Verify: `/images/final?debug` shows badges; `/images/final` shows none — pending browser check

### ✅ Checkpoint E — served size verified across DPR

---
**Verify cmds:** type-check `pnpm exec astro check` (no network) · full `pnpm build` (needs picsum) · visual `pnpm dev` → `/images` · served-size audit: console snippet in spec §"Verifying the served size"
**Open Qs:** Task 6 global-default vs explicit-block? · Ship #3/#4 same PR as #1/#2 or follow-up? · Task 9 worth fractional-DPR multiplier or leave 1×/2× only?
