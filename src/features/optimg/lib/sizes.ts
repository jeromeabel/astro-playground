// Layout tokens — the ONLY literals in this module. Everything downstream
// (grid CSS, `sizes` strings, pixel-perfect `widths`) derives from these, so a
// token change recomputes the whole chain with nothing to hand-sync.
export const layout = {
  maxWidth: 1024, // page container (max-w-5xl)
  padding: 24, // horizontal padding each side (px-6)
  gap: 14, // grid gap — chosen so every fixed slot divides to an integer; a
  //          fractional gap (e.g. 16) lands files on sub-pixel slots and
  //          resamples hard edges. Locked by the tiling invariant in the tests.
  border: 0, // wrapper border each side — 0 here; a bordered card would set it
  //            so the slot math stays exact.
  breakpoints: { md: 768, lg: 1024 },
};

// ---- function: one formula, nothing memorized ------------------------------

// Inner content width when the container is capped at its max.
const inner = layout.maxWidth - layout.padding * 2;

// Image content box for an N-column grid cell (cell minus its border box).
const slot = (cols: number): number =>
  Math.round((inner - layout.gap * (cols - 1)) / cols - layout.border * 2);

// Emit each exact slot at 1x and 2x so the served file maps 1:1 on every DPR.
const retina = (...widths: number[]): number[] =>
  [...new Set(widths.flatMap((w) => [w, w * 2]))].sort((a, b) => a - b);

// ---- map: named integer slots — the SSOT everything else reads -------------

export const slots = {
  md: slot(2), // 2-col grid cell (≥md)
  lg: slot(3), // 3-col grid cell (≥lg)
  cover: inner - layout.border * 2, // full-width detail image
};

// Fluid single-column slot (<md): full viewport minus page padding + border.
// Mathematically impossible to land a file on exactly — best-effort.
const mobileSlot = `calc(100vw - ${layout.padding * 2 + layout.border * 2}px)`;

const exactGridSizes = [
  `(min-width: ${layout.breakpoints.lg}px) ${slots.lg}px`,
  `(min-width: ${layout.breakpoints.md}px) ${slots.md}px`,
  mobileSlot,
].join(", ");

const exactCoverSizes = [
  `(min-width: ${layout.maxWidth}px) ${slots.cover}px`,
  mobileSlot,
].join(", ");

const approxCoverSizes = [
  `(min-width: ${layout.maxWidth}px) ${inner}px`,
  `calc(100vw - ${layout.padding * 2}px)`,
].join(", ");

// ---- bundles: grouped by context (grid | cover), paired exact vs approx -----
//   exact  = pixel-perfect: the file lands on the slot at 1x/2x, no resample
//            (hard-edged content — the pixel-perfect / final strategies).
//   approx = vw-based "good enough" for photos (auto / lqip / manual / cropped).
export const exact = {
  grid: { sizes: exactGridSizes, widths: retina(slots.lg, slots.md), width: slots.md },
  cover: { sizes: exactCoverSizes, widths: retina(slots.cover), width: slots.cover },
};

export const approx = {
  grid: `(min-width: ${layout.breakpoints.md}px) 33vw, 100vw`,
  cover: approxCoverSizes,
};
