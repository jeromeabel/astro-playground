# optimg blog capture recipe

Turn a browser screen recording into a web-tiny looping `<video>` (mp4 + webm) for the
`04-images` / web-performance blog post. No Playwright, no committed binaries.

- **Record** yourself (SimpleScreenRecorder / VLC / OBS) — `vhs` records *terminals*, not
  browsers, and every clip below is a browser visual.
- **Convert** with [`video-to-web.sh`](./video-to-web.sh) — the script *is* the recipe; the
  raw ffmpeg commands it runs are documented at the bottom so it's not a black box.
- **Store** raw + converted clips in the git-ignored `captures/` dir at the repo root.
  Nothing is committed here; a clip is promoted into the blog repo manually (see *Embed*).

It's a *performance* post, so the output is a muted `<video>`, not a gif — a gif is ~10×
heavier than the equivalent muted mp4, which is off-message for a "shrink your images" piece.

---

## 1. What to record

All three under `pnpm dev` (or `netlify serve` for production-accurate CDN URLs). Record a
generous window; trim precisely at the convert step with `START`/`END`.

| # | Clip | Steps | The "aha" |
|---|------|-------|-----------|
| **A** | **LQIP → final fade** | `/optimg/final/<id>`; DevTools → Network → throttle **Slow 3G**; hard reload (Cmd/Ctrl+Shift+R). | Blurred placeholder paints instantly, then the sharp image fades in over the 1200ms `reveal-img` transition — perceived-performance win. |
| **B** | **srcset badge flip** | `/optimg/final?debug` (Task C gate: `?debug` OR an active `sessionStorage` flag enables the audit overlay); resize the window slowly across the breakpoints. | The audit badge flips **229 → 458 → 704** as the browser picks a wider source — proof the `sizes`/`srcset` math is live, not theoretical. |
| **C** | **naive vs final** | Two windows side by side, both throttled; reload together: left `/optimg/naive`, right `/optimg/final`. | `naive` eager-loads all 20 thumbs and visibly shifts layout (CLS); `final` shows lqip placeholders, lazy-loads below the fold, and holds its layout. |

---

## 2. Convert

```sh
# A — LQIP fade: trim to the reload→sharp window, 720px wide, 15fps
START=1 END=6 SCALE=720 FPS=15 CRF=30 \
  src/features/optimg/scripts/video-to-web.sh captures/raw-lqip.mkv captures/lqip-fade

# B — srcset flip: crop to the badge region if the window has chrome, keep it readable
SCALE=720 FPS=15 CRF=30 \
  src/features/optimg/scripts/video-to-web.sh captures/raw-srcset.mkv captures/srcset-flip

# C — naive vs final: wider so both columns stay legible
SCALE=960 FPS=15 CRF=32 \
  src/features/optimg/scripts/video-to-web.sh captures/raw-vs.mkv captures/naive-vs-final
```

Each call writes `captures/<name>.mp4` + `captures/<name>.webm`. Knobs:

| Knob | Effect | Controls |
|------|--------|----------|
| `START` / `END` | `-ss` / `-to` | **time** (trim) |
| `CROP=W:H:X:Y` | `crop=` filter | viewport region |
| `SCALE=720` | `scale=720:-2` | **size — dimensions** |
| `FPS=15` | `fps=` filter | **size — bytes** |
| `CRF=30` | x264 `-crf` / vp9 `-crf -b:v 0` | **size — bytes** (higher = smaller) |

Verify a conversion:

```sh
ffprobe -hide_banner -show_entries stream=codec_type,codec_name,width,height \
  -show_entries format=duration captures/lqip-fade.mp4
# expect: one video stream (h264), no audio, your SCALE width, your trimmed duration
```

---

## 3. Embed (blog repo — later, manual)

Captures stay git-ignored here. To promote one, copy it into the blog repo
(`jeromeabel.github.io`) under `public/blog/web-performance/` and paste the raw-HTML
snippet into the `.md` post. **It must live in `public/` and use an absolute path** — Astro's
Sharp service collapses a relative animated/markdown asset to a static first frame; `public/`
files are passed through untouched, and `.md` passes raw HTML through.

```html
<video autoplay loop muted playsinline width="720"
  poster="/blog/web-performance/lqip-fade.jpg">
  <source src="/blog/web-performance/lqip-fade.webm" type="video/webm" />
  <source src="/blog/web-performance/lqip-fade.mp4" type="video/mp4" />
</video>
```

`muted` + `playsinline` are required for `autoplay` to fire on mobile; `loop` makes it a
seamless gif-replacement. List `.webm` before `.mp4` so capable browsers take the smaller file.

---

## Raw ffmpeg (what the script runs)

```sh
# mp4 — Safari-safe (yuv420p + faststart), muted
ffmpeg -ss $START -to $END -i IN -vf "crop=$CROP,scale=$SCALE:-2,fps=$FPS" \
  -c:v libx264 -crf $CRF -preset slow -pix_fmt yuv420p -movflags +faststart -an OUT.mp4

# webm — vp9 CRF mode needs -b:v 0, muted
ffmpeg -ss $START -to $END -i IN -vf "crop=$CROP,scale=$SCALE:-2,fps=$FPS" \
  -c:v libvpx-vp9 -crf $CRF -b:v 0 -pix_fmt yuv420p -an OUT.webm
```

Filter order: trim (input opts) → `crop` → `scale` → `fps`. Any knob left unset drops its
filter from the chain.
