// Opt-in served-size audit overlay. Promotes the spec's console audit (see
// docs §"Verifying the served size") to a live per-card badge: for each image
// it compares the file the browser actually loaded against the slot's CSS width
// × devicePixelRatio, so you can watch the chosen srcset candidate flip across
// breakpoints and DPR.
//
// STRICTLY OPT-IN, and the heavy work is gated *before* this chunk loads: the
// image routes only `import()` it when `?debug` is present or the toggle's
// sessionStorage flag is set, so a bare URL (e.g. the Lighthouse benchmark, in
// its own fresh Chrome with empty storage) fetches nothing and adds no DOM.
// Entering via `?debug` persists the flag so the overlay survives grid → detail
// navigation; the floating toggle turns it back off.

const BADGE_CLASS = "img-audit-badge";
const STORAGE_KEY = "img-audit";

const setAuditOn = (on: boolean) => {
  try {
    if (on) sessionStorage.setItem(STORAGE_KEY, "1");
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode / storage disabled — toggle just won't persist */
  }
};

export type Verdict = { mark: string; color: string };

// got vs need (slot × DPR): short if the file can't cover the slot at this
// density (real bug / upscaling); over-fetch if it overshoots by a clear rung
// (expected at fractional DPR — see the spec); covered otherwise.
export function verdict(got: number, need: number): Verdict {
  if (got < need - 1) return { mark: "✗ short", color: "#dc2626" };
  if (got > need * 1.25) return { mark: "≫ over", color: "#d97706" };
  return { mark: "✓ ok", color: "#16a34a" };
}

// The width of the file the browser actually picked. Astro's optimized URLs
// (/_image?…&w=N or /.netlify/images?…&w=N) carry it as the `w` query param.
// naive (no srcset) and manual (w-descriptor files, no `w` param) have none, so
// fall back to the decoded intrinsic width — itself a teaching signal.
export function servedWidth(
  img: { currentSrc: string; naturalWidth: number }
): { got: number; fromParam: boolean } {
  try {
    const loc = (globalThis as Record<string, unknown>).location;
    const base = typeof loc === 'object' && loc !== null ? (loc as { href: string }).href : 'http://localhost/';
    const w = new URL(img.currentSrc, base).searchParams.get("w");
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

    let badge = card.querySelector<HTMLElement>(`.${BADGE_CLASS}`);
    if (!badge) {
      badge = document.createElement("div");
      badge.className = BADGE_CLASS;
      // Wraps inside the card (cards are overflow-hidden, so nowrap clips the
      // right edge); max-width keeps it within the slot.
      badge.style.cssText =
        "position:absolute;top:.25rem;left:.25rem;right:.25rem;z-index:20;width:fit-content;" +
        "max-width:calc(100% - .5rem);padding:.125rem .375rem;border-radius:.25rem;" +
        "font:600 10px/1.35 ui-monospace,monospace;color:#fff;background:rgba(0,0,0,.82);" +
        "pointer-events:none;overflow-wrap:anywhere";
      if (getComputedStyle(card).position === "static") card.style.position = "relative";
      card.appendChild(badge);
    }

    const slot = Math.round(img.getBoundingClientRect().width);
    const dpr = window.devicePixelRatio;
    const need = Math.round(slot * dpr);
    const { got, fromParam } = servedWidth(img);

    // Until the image resolves, currentSrc/naturalWidth are 0 — show a neutral
    // "measuring" state instead of flashing ✗ short (red) then settling.
    if (got <= 0) {
      badge.textContent = `slot ${slot} · DPR ${dpr} · measuring…`;
      badge.style.boxShadow = "inset 0 0 0 2px #71717a";
      return;
    }

    const v = verdict(got, need);
    const gotLabel = fromParam ? `${got}w` : `${got}w nat·no-srcset`;
    badge.textContent = `slot ${slot} · DPR ${dpr} · ${gotLabel} · ${v.mark}`;
    badge.style.boxShadow = `inset 0 0 0 2px ${v.color}`;
  });
}

// Single entry, called by the routes only when the overlay is on. Persists the
// flag (so ?debug survives grid → detail nav), mounts the off-switch, and keeps
// the badges in sync: images may still be decoding, and resize/DPR changes
// (moving between monitors or zooming) shift the chosen candidate.
export function runImgAudit() {
  setAuditOn(true);
  mountToggle();
  const run = () => requestAnimationFrame(render);
  run();
  window.addEventListener("load", run);
  window.addEventListener("resize", run);
  document.querySelectorAll<HTMLImageElement>("[data-img-card] img").forEach((img) => {
    if (!img.complete) img.addEventListener("load", run, { once: true });
  });
}

// Floating off-switch. It only exists while the overlay is on (the chunk loads
// only then), so its job is to clear the flag and reload; ?debug is stripped so
// the param can't immediately re-enable it. Re-enable by visiting `?debug`.
function mountToggle() {
  if (document.getElementById("img-audit-toggle")) return;
  const btn = document.createElement("button");
  btn.id = "img-audit-toggle";
  btn.type = "button";
  btn.textContent = "🔍 debug: on";
  btn.style.cssText =
    "position:fixed;bottom:1rem;right:1rem;z-index:50;padding:.375rem .625rem;" +
    "border-radius:.5rem;border:1px solid rgba(255,255,255,.2);" +
    "font:600 12px/1 ui-monospace,monospace;color:#fff;cursor:pointer;background:#16a34a";
  btn.addEventListener("click", () => {
    setAuditOn(false);
    const url = new URL(location.href);
    url.searchParams.delete("debug");
    location.href = url.href;
  });
  document.body.appendChild(btn);
}
