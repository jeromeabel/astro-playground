import { describe, it, expect } from 'vitest';
import { layout, slots, exact, approx } from '@optimg/lib/sizes';

// These assert the *contract* — what "pixel-perfect" means — not hand-typed
// pixel values, so they survive any layout-token change. The one snapshot below
// is the human-eyeball golden (update with `vitest -u`, review the diff).

describe('sizes — slots are pixel-perfect', () => {
  it('every fixed slot is an integer (a fractional slot would resample)', () => {
    expect(Object.values(slots).every(Number.isInteger)).toBe(true);
  });

  it('integer slots tile the container exactly — caught the gap-4 314.67 bug', () => {
    const { gap, padding, maxWidth } = layout;
    expect(slots.md * 2 + gap + padding * 2).toBe(maxWidth);
    expect(slots.lg * 3 + gap * 2 + padding * 2).toBe(maxWidth);
  });

  it('matches the human-readable golden', () => {
    expect(slots).toMatchInlineSnapshot(`
      {
        "cover": 976,
        "lg": 316,
        "md": 481,
      }
    `);
  });
});

describe('sizes — exact (pixel-perfect) widths', () => {
  it('are sorted ascending and deduped', () => {
    const norm = [...new Set(exact.grid.widths)].sort((a, b) => a - b);
    expect(exact.grid.widths).toEqual(norm);
  });

  it('include each grid slot at 1x and 2x (retina)', () => {
    expect(exact.grid.widths).toContain(slots.lg);
    expect(exact.grid.widths).toContain(slots.lg * 2);
    expect(exact.grid.widths).toContain(slots.md);
    expect(exact.grid.widths).toContain(slots.md * 2);
  });

  it('cover width pairs the cover slot at 1x and 2x', () => {
    expect(exact.cover.widths).toContain(slots.cover);
    expect(exact.cover.widths).toContain(slots.cover * 2);
  });
});

describe('sizes — exact `sizes` strings derive from the map', () => {
  it('grid string carries the lg slot at the lg breakpoint', () => {
    expect(exact.grid.sizes).toContain(`${slots.lg}px`);
    expect(exact.grid.sizes).toContain(`${layout.breakpoints.lg}px`);
    expect(exact.grid.sizes).toContain(`${slots.md}px`);
    expect(exact.grid.sizes).toContain(`${layout.breakpoints.md}px`);
  });

  it('cover string carries the cover slot at the max-width breakpoint', () => {
    expect(exact.cover.sizes).toContain(`${slots.cover}px`);
    expect(exact.cover.sizes).toContain(`${layout.maxWidth}px`);
  });
});

describe('sizes — approx (good-enough) strings are viewport-based', () => {
  it('grid and cover fall back to vw, not fixed slots', () => {
    expect(approx.grid).toContain('vw');
    expect(approx.cover).toContain('vw');
  });
});
