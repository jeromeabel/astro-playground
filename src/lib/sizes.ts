// Layout tokens — single source for the grid CSS, the `sizes` strings, AND the
// pixel-perfect `widths`. Keep in sync with the Tailwind classes in the pages.
export const layout = {
  maxWidth: 768, // px, page container (max-w-3xl)
  padding: 24, // px, horizontal padding each side (px-6)
  gap: 16, // px, grid gap (gap-4)
  border: 1, // px, wrapper border each side (figure div / grid <li>)
  breakpoints: { md: 768, lg: 1024 },
};

// Inner content width when the container is capped at its max.
const inner = layout.maxWidth - layout.padding * 2; // 720

// Image content box for an N-column grid cell (cell minus its border box).
function gridSlot(cols: number): number {
  const cell = (inner - layout.gap * (cols - 1)) / cols;
  return Math.round(cell - layout.border * 2);
}

// Cover image spans the full inner width, minus the figure's border.
const coverSlot = inner - layout.border * 2; // 718

const gridMd = gridSlot(2); // 350
const gridLg = gridSlot(3); // 227

// Fluid single-column slot (<md): full viewport minus page padding + border.
// Mathematically impossible to land a file on this exactly — it's best-effort.
const mobileSlot = `calc(100vw - ${layout.padding * 2 + layout.border * 2}px)`;

// Emit each exact slot at 1x and 2x so the served file maps 1:1 on every DPR.
const retina = (...slots: number[]): number[] =>
  [...new Set(slots.flatMap((w) => [w, w * 2]))].sort((a, b) => a - b);

// Approximate sizes for the `auto`/`lqip` routes — the "good enough" default.
export const gridSizes = "(min-width: 768px) 33vw, 100vw";

// Token-derived sizes + widths for `pixel-perfect`: the served file lands on the
// real slot (border-aware), so the browser never resamples hard-edged detail.
// Grid is 1 col (<md), 2 cols (md), 3 cols (lg+).
export const pixelPerfectGridSizes = [
  `(min-width: ${layout.breakpoints.lg}px) ${gridLg}px`,
  `(min-width: ${layout.breakpoints.md}px) ${gridMd}px`,
  mobileSlot,
].join(", ");
export const pixelPerfectGridWidths = retina(gridLg, gridMd); // [227, 350, 454, 700]

// Cover (detail page): one fixed slot once the container caps at ≥768px.
export const pixelPerfectCoverSizes = [
  `(min-width: ${layout.maxWidth}px) ${coverSlot}px`,
  mobileSlot,
].join(", ");
export const pixelPerfectCoverWidths = retina(coverSlot); // [718, 1436]

// 1x base widths — also cap `max-width` (constrained) and land the <img> fallback.
export const pixelPerfectGridWidth = gridMd; // 350
export const pixelPerfectCoverWidth = coverSlot; // 718

// Detail (`cover`) default for auto/manual/lqip/cropped — approximate (ignores border).
export const detailSizes = [
  `(min-width: ${layout.maxWidth}px) ${inner}px`,
  `calc(100vw - ${layout.padding * 2}px)`,
].join(", ");
