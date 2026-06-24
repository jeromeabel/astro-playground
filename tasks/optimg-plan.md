# Implementation Plan: `/images` → "optimg" Feature — 5 New Tasks

**Date:** 2026-06-24
**Scope:** feature rename, test harness, debug-button simplification, below-fold
verification, pedagogical blog assets.
**Status:** PLAN — read-only. No code changes until decisions below are made.

> Note: `tasks/plan.md` is the **previous** (shipped) review-remediation plan;
> left intact for history. This file + `tasks/optimg-todo.md` cover the 5 new tasks.

---

## Decisions — RESOLVED (2026-06-24)

| # | Decision | Resolved |
|---|----------|----------|
| D1 | Feature/route name | **optimg** — route `/optimg`, folder `src/features/optimg`, alias `@optimg` |
| D2 | Debug-button approach (Task C) | **Keep toggle + sessionStorage**; drop `?debug`/dev-prod dual path; **benchmark resets sessionStorage** (kills the only leak risk) |
| D3 | GIF tooling (Task E) | **vhs / ffmpeg CLI** (tape script; no Playwright) |
| D4 | Test framework | **Vitest** |

D2 rationale: the user's concern is the benchmark-leak risk, not the toggle itself.
Fix = benchmark clears `sessionStorage['img-audit']` before each run; then the
toggle+persistence can stay, and the complexity removed is the redundant
`?debug` param + dev/prod branch + `initDevAudit`/`runImgAudit` split.

---

## Current-state findings (read-only, already gathered)

- **Rename surface is small:** alias `@images/*` (tsconfig), **4** import sites, **3**
  `/images` route string refs, the two folders (`src/features/images`,
  `src/pages/images`), breadcrumb labels, `CLAUDE.md`. `src/assets/demo/` and
  `public/manual/` are **not** renamed (generator globs them by path).
- **Below-fold (Task D) — already provable from source:**
  `DemoImage.astro:27` → thumbs `loading="lazy"`, covers `loading="eager"`. The
  `naive` branch (`:84`) emits a bare `<img>` with **no** `loading` attr → browser
  default eager → all 20 thumbs load eagerly. That is the **intended worst case**
  the strategy teaches, not a bug. Task D = confirm at runtime + document, not fix.
- **No test framework installed** (no vitest/playwright in package.json).
- **Debug machinery (Task C) is the complexity the user flagged:** `img-audit.ts`
  carries `?debug` param + `sessionStorage` flag + dev/prod split +
  `initDevAudit`/`runImgAudit` split + floating toggle button (~50 lines of
  state-management around a ~40-line audit).

---

## Brainstorm — Debug Button simplification (Task C, feeds D2)

Current cost: 4 moving parts (URL param, storage, dev/prod fork, toggle DOM) to
make one overlay opt-in and persistent across grid→detail nav.

| Option | What | Wins | Loses |
|--------|------|------|-------|
| **1. Pure `?debug`** (rec.) | Delete toggle + sessionStorage + dev/prod fork. One path: `?debug` present → run audit. | ~50 lines gone; one mental model; zero benchmark-leak risk (bare URL = nothing). | No cross-nav persistence (re-add `?debug` per page) and no click toggle. |
| **2. Toggle, no param/fork** | Keep floating button; it writes sessionStorage; both dev & prod read storage; drop `?debug` + dev/prod branch. | Click on/off; persists. | Storage flag *could* leak into a benchmark run in same tab — mitigated only by fresh-context benchmark. |
| **3. Keyboard shortcut** | Press `d` to toggle overlay; no persisted state, no DOM button. | Minimal DOM; discoverable via on-page hint. | Hidden affordance; no persistence. |
| **4. Astro Dev Toolbar app** | Official Astro pattern; toolbar entry toggles overlay (dev-only by design). | Idiomatic; dev-only for free; no prod code. | More setup; dev-only (no prod `?debug` for sharing a live URL). |

**Recommendation:** Option 1. It directly removes the flagged complexity, keeps the
"strictly opt-in, never in Lighthouse" guarantee for free, and persistence was a
nice-to-have. Links in the blog/post can carry `?debug` when a persistent demo URL
is wanted.

---

## Dependency graph

```
D1 (name) ─┬─> Task A (rename)  ─── must land before B/E reference new paths
           │
D2 ────────────> Task C (debug simplify)   — independent of A; smaller diff if before A
D4 ────────────> Task B (tests)            — depends on A (imports use new alias)
           Task D (below-fold verify)      — independent; read-only + 1 manual run
D3 ────────────> Task E (blog gifs)        — depends on A (URLs) and ideally C (clean overlay)
```

Order: **C → A → B → D → E** (simplify before rename = less churn; verify + assets last).

---

## Tasks (vertical slices)

### Task C — Simplify debug overlay (pending D2; assume Option 1)
**Slice:** one opt-in path, working end to end.
- Strip `sessionStorage` helpers, `initDevAudit`, `mountDebugToggle`, dev/prod fork
  from `img-audit.ts`; keep `runImgAudit` + `render` + `verdict` + `servedWidth`.
- Both routes: `if (new URLSearchParams(location.search).has("debug")) import(...).then(m => m.runImgAudit())`.
- **Acceptance:** `/images/final?debug` shows badges; `/images/final` shows none in
  dev *and* prod; no toggle button; `img-audit.ts` ≤ ~70 lines.
- **Verify:** `pnpm exec astro check`; `pnpm dev` load with/without `?debug`; grep
  shows no `sessionStorage`/`initDevAudit`.

### Task A — Rename feature → `<NAME>` (pending D1)
**Slice:** route + feature reachable under new name, build green.
- `git mv src/features/images src/features/<NAME>`; `git mv src/pages/images src/pages/<NAME>`.
- tsconfig alias `@images/*` → `@<NAME>/*` (or keep `@images` alias name, rename only
  paths — **decide**: recommend rename alias too for consistency).
- Update 4 import sites, 3 route strings, breadcrumb `href: "/images"` + labels,
  `package.json` script names if any, `CLAUDE.md`.
- **Acceptance:** `/<NAME>` and `/<NAME>/final/<id>` render; `/images` 404s; grep
  for `@images`/`/images` returns only intended/historical doc refs.
- **Verify:** `pnpm exec astro check`; `pnpm dev` walks hub→grid→detail.

### Task B — Tests for critical strategy surfaces (Vitest)
**Source-checked against Astro docs (MCP):** Vitest is Astro's recommended unit
framework; `getViteConfig()` from `astro/config` wires project settings; the
**Container API** (`experimental_AstroContainer`) renders `.astro` → HTML string so
DemoImage IS testable. Component-render tests must use `environment: 'node'`
(Astro ≥6 removed jsdom/client rendering).

**Setup:** add `vitest` devDep + `test` script; `vitest.config.ts` via
`getViteConfig({ test: { environment: 'node' } }, { image: { service: passthroughImageService() } })`.
The 2nd arg overrides the image service **for tests only**: `passthroughImageService()`
(official no-op) emits `<Picture>`/`<Image>` markup — loading, width/height, sizes,
srcset attrs — **without** running Sharp (no file output, deterministic, fast). Real
Sharp also works in node but is slow + writes files; passthrough is the test choice.

**Layer 1 — pure `.ts` logic (fast, no Astro):**
- `lib/sizes.ts` — **highest value.** Assert `gridSlot`, `retina`, the
  `pixelPerfect*Widths` arrays, cover/grid sizes strings. This math is *why*
  pixel-perfect works; a silent off-by-one upscales every card.
- `lib/strategies.ts` — all 7 ids present, order, `STRATEGY_IDS`⊆union, titles/blurbs non-empty.
- `data/gallery.ts` + `gallery.json` — 20 items, unique ids, valid `kind`/`source`,
  `crop` boolean when present, author/url present.
- `img-audit.ts` `verdict()` + `servedWidth()` — pure; test short/over/ok thresholds
  and `w`-param vs `naturalWidth` fallback (export them; `servedWidth` needs a tiny
  `currentSrc` stub).

**Layer 2 — DemoImage via Container API (real render assertions):**
- `renderToString(DemoImage, { props: { item, strategy, type, image } })` per strategy,
  under `passthroughImageService()` (no Sharp).
- **Assert (stable under passthrough — driven by props/`getHTMLAttributes`):**
  `thumb` → `loading="lazy"`; `cover` → `loading="eager" fetchpriority="high"`;
  `naive` → bare `<img>`, **no** `loading`/`srcset`; `auto`/`pixel-perfect`/`final`
  emit `srcset` + `sizes`; LQIP/`final` emit the placeholder `<img aria-hidden>`.
- **Do NOT assert under passthrough:** exact resized `w=` URLs or avif/webp formats —
  passthrough skips transformation. The pixel-perfect **width math** is asserted in
  L1 (`pixelPerfectGridWidths` array) where it actually lives; no Sharp needed.
- **Risk retired:** the image-service concern is solved by passthrough, not by
  dropping branches. Still spike the first `renderToString` to confirm markup shape.

- **Acceptance:** `pnpm test` green; sizes + strategies + gallery + verdict + per-strategy render covered.
- **Verify:** `pnpm test`; break a `sizes.ts` constant → a test fails.

### Task D — Verify below-fold lazy loading (now automatable)
**Slice:** automated guard + one runtime confirmation.
- **Automated (folds into Task B Layer 2):** Container-API assert that `thumb` renders
  emit `loading="lazy"` for every non-naive strategy and `naive` emits none. This is
  the real below-fold guarantee as a test, not just a manual note.
- **Runtime confirm (manual, per user memory):** `pnpm dev`, DevTools Network,
  throttle, scroll `/optimg/final` grid → thumbs fetch on scroll; `/optimg/naive`
  fetches all 20 upfront (worst case it teaches). Record in `CLAUDE.md`/blog notes.
- **Acceptance:** test proves thumbs lazy (non-naive) + naive eager-by-design; runtime confirms the network behavior; cover eager.
- **Verify:** `pnpm test` + Network panel.

### Task E — Pedagogical blog GIFs (pending D3)
**Slice:** committed assets + a reproducible capture recipe.
Target animations (each teaches one behavior):
1. **LQIP→final fade** — blurred placeholder → sharp, with Network throttled to
   Slow 3G so the fade is visible.
2. **srcset candidate flip** — `?debug` overlay on `/<NAME>/final?debug`, resize
   window across md/lg → badge flips 229→458→704.
3. **naive vs final byte/LCP** — side-by-side load under throttle.
- Tooling per D3. If scripted: a `scripts/capture-gifs.mjs` driving the page,
  throttling via CDP, recording frames → gif (ffmpeg/`@playwright` video → gif).
- **Acceptance:** 2–3 gifs in `docs/blog/` (or `public/`), each ≤ a few MB, plus a
  documented re-capture command.
- **Verify:** gifs open and show the transition; recipe re-runs.

---

## Checkpoints

- **CP-1 (after C):** overlay opt-in via `?debug` only; toggle/storage gone; check green.
- **CP-2 (after A):** new route live, old 404, build green, manual walk OK. ← review gate
- **CP-3 (after B):** `pnpm test` green; break-a-constant smoke test fails as expected.
- **CP-4 (after D):** below-fold behavior documented + (optional) guarded.
- **CP-5 (after E):** gifs committed + recipe reproducible. ← final review gate

## Risks

| Risk | Mitigation |
|------|------------|
| Rename misses a string ref → dead link / 404 | grep `@images` and `/images` post-rename; build + manual walk |
| Vitest can't import `.astro` / `import.meta.glob` | Unit-test pure `.ts` only; keep `.astro`/glob surfaces in manual/build checks |
| GIF capture pulls Playwright against the no-Playwright preference | D3 makes it an explicit asset-production choice; offer `vhs`/manual fallback |
| `sizes.ts` test pins current numbers, blocks legit tuning | Test the invariants (1×/2× land on slot), not just literals where possible |
| Simplified overlay loses persistence someone relied on | `?debug` in shared URLs covers the demo case; documented |
