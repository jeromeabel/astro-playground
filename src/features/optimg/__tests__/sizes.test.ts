import { describe, it, expect } from 'vitest';
import {
  gridSizes,
  detailSizes,
  pixelPerfectGridSizes,
  pixelPerfectGridWidths,
  pixelPerfectCoverWidths,
  pixelPerfectGridWidth,
  pixelPerfectCoverWidth,
  pixelPerfectCoverSizes,
} from '../lib/sizes';

describe('sizes — pixel-perfect grid widths', () => {
  it('has all 4 candidates (1x and 2x for each grid slot)', () => {
    expect(pixelPerfectGridWidths).toEqual([229, 352, 458, 704]);
  });

  it('each slot appears at double for retina', () => {
    expect(pixelPerfectGridWidths).toContain(229 * 2); // 458
    expect(pixelPerfectGridWidths).toContain(352 * 2); // 704
  });

  it('is sorted ascending', () => {
    const sorted = [...pixelPerfectGridWidths].sort((a, b) => a - b);
    expect(pixelPerfectGridWidths).toEqual(sorted);
  });

  it('has no duplicates', () => {
    expect(new Set(pixelPerfectGridWidths).size).toBe(pixelPerfectGridWidths.length);
  });
});

describe('sizes — pixel-perfect cover widths', () => {
  it('has 1x and 2x for the single cover slot', () => {
    expect(pixelPerfectCoverWidths).toEqual([720, 1440]);
  });
});

describe('sizes — 1x slot constants', () => {
  it('pixelPerfectGridWidth is the md 2-col slot', () => {
    expect(pixelPerfectGridWidth).toBe(352);
  });

  it('pixelPerfectCoverWidth is the full inner width', () => {
    expect(pixelPerfectCoverWidth).toBe(720);
  });
});

describe('sizes — sizes strings', () => {
  it('gridSizes mentions viewport widths', () => {
    expect(gridSizes).toContain('vw');
  });

  it('pixelPerfectGridSizes includes both breakpoints and px values', () => {
    expect(pixelPerfectGridSizes).toContain('1024px'); // lg breakpoint
    expect(pixelPerfectGridSizes).toContain('768px');  // md breakpoint
    expect(pixelPerfectGridSizes).toContain('229px');  // lg 3-col slot
    expect(pixelPerfectGridSizes).toContain('352px');  // md 2-col slot
  });

  it('pixelPerfectCoverSizes includes the max-width breakpoint and cover slot', () => {
    expect(pixelPerfectCoverSizes).toContain('768px');
    expect(pixelPerfectCoverSizes).toContain('720px');
  });

  it('detailSizes mentions inner width and viewport', () => {
    expect(detailSizes).toContain('720px');
    expect(detailSizes).toContain('100vw');
  });
});
