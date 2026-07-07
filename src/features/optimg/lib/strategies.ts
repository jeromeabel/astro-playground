// Single source of truth for the image-optimization strategy set. Each
// strategy is one self-contained StrategyDef record: metadata (title, blurb)
// AND behaviour (its Options bundle) live together, so adding an 8th strategy
// is one entry here — nothing else to keep in sync. The hub renders
// STRATEGIES; the two dynamic routes map STRATEGY_IDS in getStaticPaths; the
// component consumes bundles via resolveOptions() and has no
// `strategy ===` switch.

export type Source = "raw" | "public" | "picture";
export type PlaceholderKind = "none" | "skeleton" | "lqip";

export interface Options {
  source: Source;
  debug: boolean;
  placeholder: PlaceholderKind;
  animation: boolean;
  pixelPerfect: boolean;
  crop: boolean;
  aboveFold?: boolean; // undefined → derive from index/type (legacy default)
}

const base: Options = {
  source: "picture",
  debug: false,
  placeholder: "none",
  animation: false,
  pixelPerfect: false,
  crop: false,
};

// `as const` keeps the id literals so Strategy stays a derived union;
// `satisfies` type-checks every record (a malformed options bundle fails at
// compile time) without widening the ids.
const defs = [
  {
    id: "naive",
    title: "Naive",
    blurb:
      "Plain <img>, full-size, no srcset/sizes/dimensions. The measurement floor.",
    options: { ...base, source: "raw" },
  },
  {
    id: "manual",
    title: "Manual",
    blurb:
      "Hand-cut widths + srcset/sizes + baked blur over public/ files. The bash era, done right.",
    options: { ...base, source: "public" },
  },
  {
    id: "auto",
    title: "Auto",
    blurb:
      "<Picture> generates formats, srcset, sizes, and width/height. Toil deleted.",
    options: { ...base },
  },
  {
    id: "pixel-perfect",
    title: "Pixel-perfect",
    blurb:
      "sizes computed from layout tokens so the served file lands on the slot.",
    options: { ...base, pixelPerfect: true },
  },
  {
    id: "lqip",
    title: "LQIP",
    blurb:
      "Auto plus a getImage() blurred placeholder and a cache-guarded fade-in.",
    options: { ...base, placeholder: "lqip", animation: true },
  },
  {
    id: "cropped",
    title: "Cropped",
    blurb:
      "fit=cover with per-view aspect ratios: 4:3 thumb and 16:9 cover from one imported source — two distinct build outputs.",
    options: { ...base, crop: true },
  },
  {
    id: "final",
    title: "Final",
    blurb:
      "The production stack: LQIP placeholder + cache-guarded fade, over pixel-perfect token widths, with an optional per-image crop.",
    options: {
      ...base,
      placeholder: "lqip",
      animation: true,
      pixelPerfect: true,
      crop: true,
    },
  },
] as const satisfies readonly {
  id: string;
  title: string;
  blurb: string;
  options: Options;
}[];

export type Strategy = (typeof defs)[number]["id"];

export interface StrategyDef {
  id: Strategy;
  title: string;
  blurb: string;
  options: Options;
}

export const STRATEGIES: readonly StrategyDef[] = defs;

export const STRATEGY_IDS = defs.map((s) => s.id) as Strategy[];

const byId = new Map<Strategy, StrategyDef>(STRATEGIES.map((s) => [s.id, s]));

export function resolveOptions(
  strategy: Strategy,
  overrides?: Partial<Options>,
): Options {
  return { ...byId.get(strategy)!.options, ...overrides };
}
