import { describe, it, expect } from 'vitest';
import { STRATEGIES, STRATEGY_IDS } from '../lib/strategies';
import type { Strategy } from '../lib/strategies';

const EXPECTED_IDS: Strategy[] = [
  'naive', 'manual', 'auto', 'pixel-perfect', 'lqip', 'cropped', 'final',
];

describe('strategies', () => {
  it('has exactly 7 strategies', () => {
    expect(STRATEGIES).toHaveLength(7);
  });

  it('has all expected ids in order', () => {
    expect(STRATEGIES.map((s) => s.id)).toEqual(EXPECTED_IDS);
  });

  it('STRATEGY_IDS matches STRATEGIES map order', () => {
    expect(STRATEGY_IDS).toEqual(STRATEGIES.map((s) => s.id));
  });

  it('STRATEGY_IDS contains all 7 ids', () => {
    expect(STRATEGY_IDS).toHaveLength(7);
    for (const id of EXPECTED_IDS) {
      expect(STRATEGY_IDS).toContain(id);
    }
  });

  it('all titles are non-empty strings', () => {
    for (const s of STRATEGIES) {
      expect(s.title.length, `title for ${s.id}`).toBeGreaterThan(0);
    }
  });

  it('all blurbs are non-empty strings', () => {
    for (const s of STRATEGIES) {
      expect(s.blurb.length, `blurb for ${s.id}`).toBeGreaterThan(0);
    }
  });
});
