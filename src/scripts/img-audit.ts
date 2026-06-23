// Opt-in served-size audit overlay. Promotes the spec's console audit (see
// docs §"Verifying the served size") to a live per-card badge: for each image
// it compares the file the browser actually loaded against the slot's CSS width
// × devicePixelRatio, so you can watch the chosen srcset candidate flip across
// breakpoints and DPR.
//
// STRICTLY OPT-IN. This module is only imported when the page is loaded with a
// `?debug` query param (see the guard in the image routes), so it never enters
// the Lighthouse measurement path and adds zero bytes/DOM to the bare URL.

const BADGE_CLASS = "img-audit-badge";

type Verdict = { mark: string; color: string };

// got vs need (slot × DPR): short if the file can't cover the slot at this
// density (real bug / upscaling); over-fetch if it overshoots by a clear rung
// (expected at fractional DPR — see the spec); covered otherwise.
function verdict(got: number, need: number): Verdict {
  if (got < need - 1) return { mark: "✗ short", color: "#dc2626" };
  if (got > need * 1.25) return { mark: "≫ over", color: "#d97706" };
  return { mark: "✓ covered", color: "#16a34a" };
}

// The width of the file the browser actually picked. Astro's optimized URLs
// (/_image?…&w=N or /.netlify/images?…&w=N) carry it as the `w` query param.
// naive (no srcset) and manual (w-descriptor files, no `w` param) have none, so
// fall back to the decoded intrinsic width — itself a teaching signal.
function servedWidth(img: HTMLImageElement): { got: number; fromParam: boolean } {
  try {
    const w = new URL(img.currentSrc, location.href).searchParams.get("w");
    if (w) return { got: Number(w), fromParam: true };
  } catch {
    /* currentSrc may be empty before load — fall through */
  }
  return { got: img.naturalWidth, fromParam: false };
}

function render() {
  document.querySelectorAll<HTMLElement>("[data-img-card]").forEach((card) => {
    const img = card.querySelector("img:not([aria-hidden='true'])") as HTMLImageElement | null;
    if (!img) return;

    const slot = Math.round(img.getBoundingClientRect().width);
    const dpr = window.devicePixelRatio;
    const need = Math.round(slot * dpr);
    const { got, fromParam } = servedWidth(img);
    const v = verdict(got, need);

    let badge = card.querySelector<HTMLElement>(`.${BADGE_CLASS}`);
    if (!badge) {
      badge = document.createElement("div");
      badge.className = BADGE_CLASS;
      badge.style.cssText =
        "position:absolute;top:.25rem;left:.25rem;z-index:20;padding:.125rem .375rem;" +
        "border-radius:.25rem;font:600 11px/1.4 ui-monospace,monospace;color:#fff;" +
        "background:rgba(0,0,0,.78);pointer-events:none;white-space:nowrap";
      if (getComputedStyle(card).position === "static") card.style.position = "relative";
      card.appendChild(badge);
    }

    const gotLabel = fromParam ? `got ${got}w` : `nat ${got}w · no srcset`;
    badge.textContent = `slot ${slot} · DPR ${dpr} · ${gotLabel} · ${v.mark}`;
    badge.style.boxShadow = `inset 0 0 0 2px ${v.color}`;
  });
}

export function runImgAudit() {
  // Images may still be decoding; render now, on load, and on every resize/DPR
  // change (moving between monitors or zooming shifts the chosen candidate).
  const run = () => requestAnimationFrame(render);
  run();
  window.addEventListener("load", run);
  window.addEventListener("resize", run);
  document.querySelectorAll<HTMLImageElement>("[data-img-card] img").forEach((img) => {
    if (!img.complete) img.addEventListener("load", run, { once: true });
  });
}
