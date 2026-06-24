// Single source of truth for the image-optimization strategy set.
// The hub renders STRATEGIES; the two dynamic routes map STRATEGY_IDS in
// getStaticPaths. The Strategy union is derived so adding an 8th strategy is a
// one-line edit here — no hand-written union to keep in sync.

export const STRATEGIES = [
  { id: "naive", title: "Naive", blurb: "Plain <img>, full-size, no srcset/sizes/dimensions. The measurement floor." },
  { id: "manual", title: "Manual", blurb: "Hand-cut widths + srcset/sizes + baked blur over public/ files. The bash era, done right." },
  { id: "auto", title: "Auto", blurb: "<Picture> generates formats, srcset, sizes, and width/height. Toil deleted." },
  { id: "pixel-perfect", title: "Pixel-perfect", blurb: "sizes computed from layout tokens so the served file lands on the slot." },
  { id: "lqip", title: "LQIP", blurb: "Auto plus a getImage() blurred placeholder and a cache-guarded fade-in." },
  { id: "cropped", title: "Cropped", blurb: "fit=cover with per-view aspect ratios: 4:3 thumb and 16:9 cover from one imported source — two distinct build outputs." },
  { id: "final", title: "Final", blurb: "The production stack: LQIP placeholder + cache-guarded fade, over pixel-perfect token widths, with an optional per-image crop." },
] as const;

export type Strategy = (typeof STRATEGIES)[number]["id"];

export const STRATEGY_IDS = STRATEGIES.map((s) => s.id) as Strategy[];
