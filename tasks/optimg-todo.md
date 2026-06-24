# TODO — optimg feature (5 tasks)

Order: C → A → B → D → E. Blockers D1–D4 resolved before starting (see optimg-plan.md).

## Blockers — RESOLVED
- [x] D1 — name = **optimg** (route `/optimg`, folder `src/features/optimg`, alias `@optimg`)
- [x] D2 — keep toggle + sessionStorage; **drop `?debug`/dev-prod dual path**; **benchmark resets sessionStorage**
- [x] D3 — gif tooling = **vhs / ffmpeg CLI** (tape script)
- [x] D4 — test framework = **Vitest**

## Task C — simplify debug overlay (gate B: ?debug OR storage) ✅
Decision revised: gate **B** (?debug OR sessionStorage), not literal D2. Why: (1) Task E
needs the shareable `?debug` URL; (2) benchmark bareness comes from gating the *import*,
not from resetting storage. Lighthouse spawns its own fresh headless Chrome → storage is
always empty there, so the "benchmark resets sessionStorage" step is **moot/dropped** (no
dead code added).
- [x] Drop dev/prod fork + initDevAudit + isAuditOn; keep runImgAudit + toggle + storage
- [x] Both routes gate the dynamic import inline: `?debug` OR `sessionStorage['img-audit']`
- [x] runImgAudit now persists the flag + mounts the off-switch toggle (single entry)
- [x] ~~Benchmark clears sessionStorage~~ — moot (Lighthouse = fresh Chrome). Documented.
- [x] CP-1: astro check green (0 err); removed symbols grep-clean. Manual dev walk below.

## Task A — rename feature
- [ ] git mv src/features/images + src/pages/images → <NAME>
- [ ] tsconfig alias + 4 import sites + 3 route strings + breadcrumbs + CLAUDE.md
- [ ] CP-2: /<NAME> renders, /images 404s, build green, manual walk ← review

## Task B — tests (Vitest + Container API)
- [ ] Add Vitest devDep + `test` script; vitest.config.ts via getViteConfig({test:{environment:'node'}}, {image:{service:passthroughImageService()}})
- [ ] L1 sizes.ts math (gridSlot/retina/widths) — highest value
- [ ] L1 strategies.ts (7 ids, order, derivations)
- [ ] L1 gallery.json/.ts (20 items, unique ids, crop boolean, fields)
- [ ] L1 img-audit verdict()/servedWidth() (export + test thresholds + fallback)
- [ ] L2 spike: renderToString(DemoImage) under Container API (image-service risk)
- [ ] L2 per-strategy render: loading attrs, srcset/sizes presence, naive bare img
- [ ] CP-3: pnpm test green; break-a-constant smoke fails

## Task D — below-fold verify (folds into B-L2) ✅
- [x] Automated: data-driven Container-API assert over STRATEGY_IDS — all 6 non-naive
  thumbs loading="lazy"; naive emits none (DemoImage.test.ts, 52 tests green)
- [ ] Manual runtime: throttled Network, scroll final grid (lazy) vs naive (eager-all)
  — **user-run** (Playwright-skip pref); recipe documented in CLAUDE.md
- [x] Document thumbs-lazy / naive-eager-by-design / cover-eager (CLAUDE.md)
- [x] CP-4: pnpm test green (52/52); guard fails if a thumb loses lazy

## Task E — blog gifs (vhs/ffmpeg)
- [ ] gifs.tape: LQIP→final fade (Slow 3G throttle)
- [ ] srcset flip via overlay on resize (229→458→704)
- [ ] naive vs final load comparison
- [ ] Commit gifs + tape recipe (`vhs gifs.tape`)
- [ ] CP-5 ← final review
