// Pure moiré math — no side effects, safe to import from both Node scripts
// and Vitest tests.
//
// SSOT for slot widths is src/features/optimg/lib/sizes.ts (slots.lg / slots.cover).
// These literals are duplicated here because gen-images.mjs runs under plain Node
// and cannot import TypeScript. The contract test in __tests__/moire.test.ts
// asserts MOIRE_SLOTS matches the TypeScript SSOT.

export const SRC_W = 2400;
export const TARGET_STRIPE_CSS = 5;

// Slot widths that drive the moiré demonstration.
export const MOIRE_SLOTS = {
  grid: 316, // 3-col grid cell at lg — must equal sizes.ts slots.lg
  cover: 976, // full-width detail image — must equal sizes.ts slots.cover
};

// Period (px in source space) that renders as TARGET_STRIPE_CSS CSS px on `slot`.
export const p0 = (slot) => Math.round((TARGET_STRIPE_CSS * SRC_W) / slot);

// Half-period bar width for a 50% duty-cycle grating.
export const bar = (slot) => Math.round(p0(slot) / 2);
