// Preset/factory layer over the composable CustomImage options. The 7 named
// strategies are option BUNDLES here — the component has no `strategy ===` switch.
// Adding an 8th demo, or an intermediate config for Phase 2b, is one entry / one
// resolveOptions() override; nothing in the component changes.
import type { Strategy } from "./strategies";

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
  source: "picture", debug: false, placeholder: "none",
  animation: false, pixelPerfect: false, crop: false,
};

export const STRATEGY_PRESETS: Record<Strategy, Options> = {
  naive:            { ...base, source: "raw" },
  manual:           { ...base, source: "public" },
  auto:             { ...base },
  "pixel-perfect":  { ...base, pixelPerfect: true },
  lqip:             { ...base, placeholder: "lqip", animation: true },
  cropped:          { ...base, crop: true },
  final:            { ...base, placeholder: "lqip", animation: true, pixelPerfect: true, crop: true },
};

export function resolveOptions(strategy: Strategy, overrides?: Partial<Options>): Options {
  return { ...STRATEGY_PRESETS[strategy], ...overrides };
}
