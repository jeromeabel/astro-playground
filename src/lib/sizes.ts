// Layout tokens — single source for the grid CSS and the responsive `sizes`.
export const layout = {
  maxWidth: 768, // px, page container (max-w-3xl-ish)
  padding: 24, // px, horizontal padding each side (px-6)
  gap: 16, // px, grid gap (gap-4)
  breakpoints: { md: 768, lg: 1024 },
};

// width of one grid cell at a given column count within the container
function cellWidth(cols: number): number {
  const inner = layout.maxWidth - layout.padding * 2;
  return Math.floor((inner - layout.gap * (cols - 1)) / cols);
}

// Approximate sizes for the `auto` route — the "good enough" framework default.
export const gridSizes = "(min-width: 768px) 33vw, 100vw";

// Token-derived sizes for `pixel-perfect`: the served file lands on the real slot.
// Grid is 1 col (<md), 2 cols (md), 3 cols (lg+).
export const pixelPerfectGridSizes = [
  `(min-width: ${layout.breakpoints.lg}px) ${cellWidth(3)}px`,
  `(min-width: ${layout.breakpoints.md}px) ${cellWidth(2)}px`,
  `calc(100vw - ${layout.padding * 2}px)`,
].join(", ");

// Detail (`cover`) image spans the container width.
export const detailSizes = [
  `(min-width: ${layout.maxWidth}px) ${layout.maxWidth - layout.padding * 2}px`,
  `calc(100vw - ${layout.padding * 2}px)`,
].join(", ");
