// Pure render-decision seam: Options + position context in, a flat RenderPlan
// out. Everything here is sync and side-effect free — the async LQIP build
// lives in lib/lqip.ts, markup in the component. Tests hit this interface
// directly (render-plan.test.ts) instead of string-matching rendered HTML.
import type { Options, Source, PlaceholderKind } from "./strategies";
import { exact, approx } from "./sizes";

export interface RenderContext {
  ctx: "grid" | "cover";
  index?: number; // grid position; omit → below-fold
  itemCrop?: boolean; // item.crop — per-item opt-in, honored only by pixel-perfect crop
}

export interface RenderPlan {
  source: Source;
  ctx: "grid" | "cover";
  loading: "eager" | "lazy";
  fetchpriority: "high" | "auto";
  fade: boolean;
  sizes: string;
  width: number;
  widths?: number[];
  height?: number;
  fit?: "cover";
  position?: "top";
  aspect: [number, number];
  placeholder: PlaceholderKind;
  needsLqip: boolean;
  showSkeleton: boolean;
  debug: boolean;
}

// Viewport is unknown at build time (static prerender, no Client Hints on
// first nav) so EAGER_AHEAD is a fixed worst-case constant: 6 covers mobile
// 1-col (3 above fold) and md/lg 2–3-col (2 rows = 6). Over-eager on mobile
// costs ~2 small thumbs; lazy-on-LCP hurts LCP. Bias high.
const EAGER_AHEAD = 6;

// undefined index (caller omitted it) → Infinity → safely below-fold.
const isAboveFoldIndex = (i: number | undefined): boolean =>
  (i ?? Infinity) < EAGER_AHEAD;

// Whether the above-fold (LCP-candidate) card still fades its real <Picture>
// in over the placeholder. This is NOT provisional: a live Lighthouse
// LCP-candidacy check (DemoImage.astro, commit e0daa1f, re-validated in
// 854a5cd) found the browser discounts the low-entropy 32px placeholder as an
// LCP candidate every run — LCP always resolves to the real streaming <img>,
// so an opacity:0 fade on the above-fold element directly delays LCP paint.
// Above-fold/cover images therefore snap; only lazy below-fold images fade.
const ABOVE_FOLD_FADE = false;

export function renderPlan(opts: Options, rc: RenderContext): RenderPlan {
  const isCover = rc.ctx === "cover";
  const isLCP = !isCover && rc.index === 0;
  // opts.aboveFold, when explicitly set, overrides the index/type derivation —
  // lets the option matrix exercise loading independent of position.
  const aboveFold = opts.aboveFold ?? (isCover || isAboveFoldIndex(rc.index));
  const loading = aboveFold ? "eager" : "lazy";
  // fetchpriority="high" is a scalpel — exactly one element (the LCP).
  const fetchpriority = isCover || isLCP ? "high" : "auto";
  const fade = opts.animation && (aboveFold ? ABOVE_FOLD_FADE : true);

  // approx (vw-based) is "good enough" for photos; exact (token-derived)
  // lands the served file exactly on the slot (no resampling).
  const sizes = opts.pixelPerfect ? exact[rc.ctx].sizes : approx[rc.ctx];
  const width = opts.pixelPerfect ? exact[rc.ctx].width : isCover ? 1280 : 640;
  const widths = opts.pixelPerfect ? exact[rc.ctx].widths : undefined;

  // Crop (preserves the cropped-vs-final split exactly): coarse crop is
  // unconditional, pixel-perfect crop honors the per-item opt-in — so "final"
  // only crops when itemCrop, "cropped" always crops.
  const perItemOptIn = opts.pixelPerfect; // only final is pp+crop
  const doCrop = opts.crop && (!perItemOptIn || rc.itemCrop === true);
  const [cropW, cropH]: [number, number] = isCover ? [16, 9] : [4, 3];
  const height = doCrop ? Math.round((width * cropH) / cropW) : undefined;
  const fit = doCrop ? ("cover" as const) : undefined;
  const position = doCrop && opts.pixelPerfect ? ("top" as const) : undefined; // final sets position:"top"; cropped does not

  // Displayed aspect, so the LQIP placeholder doesn't distort behind the
  // real image.
  const aspect: [number, number] = doCrop ? [cropW, cropH] : [3, 2];

  // Composability boundary: placeholder/animation only have a visible effect
  // when source:"picture" — raw/public render a bare <img>.
  const needsLqip = opts.placeholder === "lqip" && opts.source === "picture";
  const showSkeleton = opts.source === "picture" && opts.placeholder === "skeleton";

  return {
    source: opts.source,
    ctx: rc.ctx,
    loading,
    fetchpriority,
    fade,
    sizes,
    width,
    widths,
    height,
    fit,
    position,
    aspect,
    placeholder: opts.placeholder,
    needsLqip,
    showSkeleton,
    debug: opts.debug,
  };
}
