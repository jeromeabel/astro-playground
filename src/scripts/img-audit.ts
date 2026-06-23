// Opt-in served-size audit overlay. Promotes the spec's console audit (see
// docs §"Verifying the served size") to a live per-card badge: for each image
// it compares the file the browser actually loaded against the slot's CSS width
// × devicePixelRatio, so you can watch the chosen srcset candidate flip across
// breakpoints and DPR.
//
// STRICTLY OPT-IN. In production only a `?debug` query param runs runImgAudit()
// (guarded in the image routes), so the Lighthouse path stays bare. In dev the
// on/off state lives in sessionStorage (initDevAudit) so it survives navigation
// between grid and detail without threading ?debug through every link; the
// production runtime never reads storage, so a stale flag can't leak into a
// benchmark.

const BADGE_CLASS = "img-audit-badge";
const STORAGE_KEY = "img-audit";

const isAuditOn = () => {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const setAuditOn = (on: boolean) => {
  try {
    if (on) sessionStorage.setItem(STORAGE_KEY, "1");
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode / storage disabled — toggle just won't persist */
  }
};

type Verdict = { mark: string; color: string };

// got vs need (slot × DPR): short if the file can't cover the slot at this
// density (real bug / upscaling); over-fetch if it overshoots by a clear rung
// (expected at fractional DPR — see the spec); covered otherwise.
function verdict(got: number, need: number): Verdict {
  if (got < need - 1) return { mark: "✗ short", color: "#dc2626" };
  if (got > need * 1.25) return { mark: "≫ over", color: "#d97706" };
  return { mark: "✓ ok", color: "#16a34a" };
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

// Dev-only entry: state comes from sessionStorage so it persists across grid →
// detail navigation in the same tab. A `?debug` URL forces it on (and persists),
// matching the production opt-in. Renders the toggle and runs the audit if on.
export function initDevAudit(urlDebug: boolean) {
  if (urlDebug) setAuditOn(true);
  const on = isAuditOn();
  mountDebugToggle(on);
  if (on) runImgAudit();
}

// Dev-only floating toggle: flips the shared sessionStorage flag and reloads, so
// the overlay turns on/off without hand-editing URLs. Never shipped to production
// (callers gate on import.meta.env.DEV), keeping the benchmark DOM bare.
function mountDebugToggle(active: boolean) {
  if (document.getElementById("img-audit-toggle")) return;
  const btn = document.createElement("button");
  btn.id = "img-audit-toggle";
  btn.type = "button";
  btn.textContent = active ? "🔍 debug: on" : "🔍 debug: off";
  btn.style.cssText =
    "position:fixed;bottom:1rem;right:1rem;z-index:50;padding:.375rem .625rem;" +
    "border-radius:.5rem;border:1px solid rgba(255,255,255,.2);" +
    `font:600 12px/1 ui-monospace,monospace;color:#fff;cursor:pointer;` +
    `background:${active ? "#16a34a" : "rgba(0,0,0,.82)"}`;
  btn.addEventListener("click", () => {
    setAuditOn(!active);
    // Strip ?debug so storage is the sole source of truth — otherwise the URL
    // param re-enables on every reload and the toggle can never turn it off.
    const url = new URL(location.href);
    url.searchParams.delete("debug");
    location.href = url.href;
  });
  document.body.appendChild(btn);
}
