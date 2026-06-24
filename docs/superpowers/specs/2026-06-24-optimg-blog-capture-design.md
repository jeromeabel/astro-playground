# Optimg blog capture — design (Task E)

**Date:** 2026-06-24
**Scope:** Tooling + docs to turn a browser screen recording into a web-tiny looping
`<video>` for the `04-images` web-performance blog post. No Playwright, no committed
binary assets.
**Status:** APPROVED — ready for implementation plan.

> Supersedes the Task E sketch in `tasks/optimg-plan.md` (which assumed `vhs` + committed
> gifs). Two decisions changed during brainstorming; see "Decisions revised" below.

---

## Decisions revised (brainstorm 2026-06-24)

| # | Original (plan/D3) | Revised | Why |
|---|--------------------|---------|-----|
| D3a | Capture via `vhs` | **User records** with SimpleScreenRecorder/VLC | `vhs` records *terminals*, not browsers; all 3 animations are browser visuals. |
| D3b | Output `gif`, commit to repo | **Looping `<video>` (mp4+webm)**, git-ignored | It's a web-*performance* post; gif is ~10× heavier than muted mp4. Shipping a heavy gif on a "shrink your images" post is off-message. |
| D3c | Assets committed (`docs/blog/` or `public/`) | **Git-ignored `captures/`** in playground | Post is `draft: true`; captures stay local until a clip is promoted. |

ffmpeg is the kept half of D3 (present on the machine; `x11grab` + `palettegen` confirmed,
though x11grab is unused now that the user records directly).

---

## Astro embedding constraint (verified via Astro docs MCP)

- **"Images stored in the `public/` folder are never optimized."** Local `src/` markdown
  images (`![](./x.gif)`) **are** run through Sharp.
- Astro's Sharp service does not pass `animated: true` → a relative animated asset in a
  content collection collapses to a **static first frame**.
- Therefore an animated asset **must** live in `public/` and be referenced by absolute
  path. `.md` passes raw HTML through, so a `<video>` tag works.
- Heads-up (out of scope): the blog's existing `src/content/work/craslab/index.md:108`
  `![Feedback](./feedback.gif)` is a relative markdown image → likely already rendering
  as a still frame. Flagged, not fixed here.

---

## Components

### 1. Git-ignored capture workspace
- New `captures/` directory at repo root; add to `.gitignore`.
- Raw recordings (mp4/mkv/webm) go in; converted `.mp4`/`.webm` come out. Nothing committed.

### 2. Conversion script (committed) — `src/features/optimg/scripts/video-to-web.sh`
- POSIX `sh`/`bash`, ffmpeg wrapper. One input video → two outputs:
  - **mp4**: `libx264`, `-movflags +faststart`, `-pix_fmt yuv420p` (Safari-safe), `-an`.
  - **webm**: `libvpx-vp9`, `-an`.
- Knobs (env vars or flags), covering the "control size + time" ask:
  | Knob | ffmpeg effect | Controls |
  |------|---------------|----------|
  | `START` / `END` | `-ss` / `-to` | **time** (trim) |
  | `CROP=W:H:X:Y` | `crop=` filter | viewport region |
  | `SCALE=720` | `scale=720:-2` | **size — dimensions** |
  | `FPS=15` | `fps=` filter | **size — bytes** |
  | `CRF=30` | `-crf` (x264) / `-crf`+`-b:v 0` (vp9) | **size — bytes** |
- Usage: `video-to-web.sh captures/raw.mkv captures/lqip-fade` → writes
  `captures/lqip-fade.mp4` + `.webm`.
- The script *is* the reproducible recipe (acceptance: "recipe re-runs"). The raw ffmpeg
  command is also printed in `capture.md` so it's transparent, not a black box.
- Filter order: trim (input opts) → `crop` → `scale` → `fps`, applied as a single
  `-vf` chain.

### 3. Recipe doc (committed) — `src/features/optimg/scripts/capture.md`
- **What to record** (user-driven, manual — no automation):
  1. **LQIP→final fade** — `/optimg/final/<id>`; DevTools throttle **Slow 3G**; hard
     reload → blurred placeholder → sharp (1200ms `reveal-img` fade).
  2. **srcset flip** — `/optimg/final?debug` (Task C gate B: `?debug` OR sessionStorage
     still active); resize window slowly across breakpoints → audit badge flips
     **229 → 458 → 704**.
  3. **naive vs final** — two windows side by side under throttle → `naive` eager-loads
     all 20 + visible CLS vs `final` lqip + lazy.
- **Convert** — per-clip `video-to-web.sh` invocation examples.
- **Embed** — raw-HTML snippet for the `.md`:
  ```html
  <video autoplay loop muted playsinline
    src="/blog/web-performance/lqip-fade.mp4"
    poster="..." width="720">
  </video>
  ```
  with target path `public/blog/web-performance/<name>.mp4` (+ `.webm` `<source>`) in
  the **blog repo** (`jeromeabel.github.io`). Promotion (copy clip → blog `public/` +
  paste snippet) is a later manual step, since captures stay git-ignored here.

### 4. CLAUDE.md
- One-line pointer under the optimg section to `scripts/capture.md`. No other prose moved.

### 5. Blog repo
- **No changes in this task.** Only the documented embed snippet + path, ready for promotion.

---

## Out of scope
- Automated/headless capture (Playwright/CDP) — explicitly declined.
- Fixing `craslab/feedback.gif` (separate repo, separate concern).
- Committing any rendered clip; promoting a clip into the blog post.
- Updating the blog post's stale "five strategies"/`benchmark:images` text (seven now;
  separate task).

## Acceptance
- `captures/` git-ignored; `git status` clean after a conversion run.
- `video-to-web.sh raw.mkv out` produces a playing `out.mp4` + `out.webm`; knobs
  (`START/END/CROP/SCALE/FPS/CRF`) measurably change duration/dimensions/bytes.
- `capture.md` documents the 3 recordings, conversion examples, and the `<video>` embed
  snippet + blog public path.
- CLAUDE.md points to the recipe.

## Verify
- Run `video-to-web.sh` on a throwaway clip; `ffprobe` confirms duration/scale/no-audio.
- `git status` shows no captures tracked.
- `mpv`/browser plays both outputs.

## Risks
| Risk | Mitigation |
|------|------------|
| mp4 won't play in Safari | `-pix_fmt yuv420p` + `+faststart` baked into the script. |
| Someone commits a heavy clip | `captures/` git-ignored; doc states clips are local-only. |
| Embed renders static (optimized) | Doc mandates `public/` + absolute path; verified against Astro docs. |
| webm encode slow (vp9) | Acceptable for short clips; `CRF`/`FPS` knobs bound size/time. |
