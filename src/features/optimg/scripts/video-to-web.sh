#!/usr/bin/env bash
#
# video-to-web.sh — convert one screen recording into a web-tiny looping <video>
# pair (mp4 + webm) for the optimg blog post. See ./capture.md for the recipe.
#
# Usage:
#   video-to-web.sh INPUT OUTPUT_BASE
#     INPUT        raw recording (mp4/mkv/webm/...)
#     OUTPUT_BASE  output path without extension; writes OUTPUT_BASE.mp4 + .webm
#
# Example:
#   video-to-web.sh captures/raw.mkv captures/lqip-fade
#     -> captures/lqip-fade.mp4  (libx264, Safari-safe, no audio)
#        captures/lqip-fade.webm (libvpx-vp9, no audio)
#
# Knobs (env vars) — control time and size, per the design spec:
#   START=2        -ss     trim: start at 2s            (time)
#   END=7          -to     trim: stop at 7s             (time)
#   CROP=W:H:X:Y   crop=   keep only that viewport box  (region)
#   SCALE=720      scale=  output width, height auto     (size — dimensions)
#   FPS=15         fps=    frame rate                    (size — bytes)
#   CRF=30         -crf    quality; higher = smaller      (size — bytes)
#
# Filter order: trim (input opts) -> crop -> scale -> fps, one -vf chain.
#
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: $0 INPUT OUTPUT_BASE" >&2
  echo "  e.g. $0 captures/raw.mkv captures/lqip-fade" >&2
  exit 2
fi

IN="$1"
OUT="$2"

if [ ! -f "$IN" ]; then
  echo "error: input not found: $IN" >&2
  exit 1
fi

command -v ffmpeg >/dev/null 2>&1 || { echo "error: ffmpeg not on PATH" >&2; exit 1; }

# --- trim (input options, before -i for fast seek) ---
TRIM=()
[ -n "${START:-}" ] && TRIM+=(-ss "$START")
[ -n "${END:-}" ]   && TRIM+=(-to "$END")

# --- build the -vf chain (crop -> scale -> fps) ---
FILTERS=()
[ -n "${CROP:-}" ]  && FILTERS+=("crop=${CROP}")
[ -n "${SCALE:-}" ] && FILTERS+=("scale=${SCALE}:-2")   # -2 keeps height even, aspect locked
[ -n "${FPS:-}" ]   && FILTERS+=("fps=${FPS}")

VF=()
if [ "${#FILTERS[@]}" -gt 0 ]; then
  chain=$(IFS=,; echo "${FILTERS[*]}")
  VF=(-vf "$chain")
fi

CRF="${CRF:-30}"

echo "==> input:   $IN"
echo "==> outputs: ${OUT}.mp4  ${OUT}.webm"
[ "${#TRIM[@]}" -gt 0 ]    && echo "==> trim:    ${TRIM[*]}"
[ "${#VF[@]}" -gt 0 ]      && echo "==> filters: ${VF[1]}"
echo "==> crf:     $CRF"

# --- mp4: libx264, Safari-safe (+faststart, yuv420p), muted ---
ffmpeg -y "${TRIM[@]}" -i "$IN" "${VF[@]}" \
  -c:v libx264 -crf "$CRF" -preset slow \
  -pix_fmt yuv420p -movflags +faststart \
  -an "${OUT}.mp4"

# --- webm: libvpx-vp9, muted (CRF mode needs -b:v 0) ---
ffmpeg -y "${TRIM[@]}" -i "$IN" "${VF[@]}" \
  -c:v libvpx-vp9 -crf "$CRF" -b:v 0 \
  -pix_fmt yuv420p \
  -an "${OUT}.webm"

echo "==> done. probe with: ffprobe -hide_banner ${OUT}.mp4"
