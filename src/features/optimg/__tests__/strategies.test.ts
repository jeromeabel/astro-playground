import { describe, it, expect } from 'vitest';
import { STRATEGIES, STRATEGY_IDS, resolveOptions } from '@optimg/lib/strategies';
import type { Strategy, Options } from '@optimg/lib/strategies';

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

// =========================================================================
// C5 migration guard — each StrategyDef.options must equal the pre-merge
// STRATEGY_PRESETS bundle byte-for-byte. Literals copied from presets.ts
// as of commit 4808bec; do NOT "simplify" them.
// =========================================================================

const base: Options = {
  source: "picture", debug: false, placeholder: "none",
  animation: false, pixelPerfect: false, crop: false,
};

const LEGACY_PRESETS: Record<Strategy, Options> = {
  naive:            { ...base, source: "raw" },
  manual:           { ...base, source: "public" },
  auto:             { ...base },
  "pixel-perfect":  { ...base, pixelPerfect: true },
  lqip:             { ...base, placeholder: "lqip", animation: true },
  cropped:          { ...base, crop: true },
  final:            { ...base, placeholder: "lqip", animation: true, pixelPerfect: true, crop: true },
};

describe('StrategyDef.options (C5 migration)', () => {
  it.each(STRATEGY_IDS)('%s options are byte-identical to the legacy preset', (id) => {
    const def = STRATEGIES.find((s) => s.id === id)!;
    expect(def.options).toEqual(LEGACY_PRESETS[id]);
  });

  it('every strategy carries an options bundle', () => {
    for (const s of STRATEGIES) {
      expect(s.options, `options for ${s.id}`).toBeDefined();
    }
  });

  it('no strategy enables debug (runtime toggle, not a strategy trait)', () => {
    for (const s of STRATEGIES) expect(s.options.debug).toBe(false);
  });
});

describe('resolveOptions (moved from presets.ts)', () => {
  it('returns the bundle unchanged with no overrides', () => {
    expect(resolveOptions('auto')).toEqual(LEGACY_PRESETS.auto);
  });

  it('merges overrides for intermediate configs (auto + pixelPerfect)', () => {
    expect(resolveOptions('auto', { pixelPerfect: true })).toMatchObject({
      source: 'picture', pixelPerfect: true, placeholder: 'none',
    });
  });

  it('does not mutate the strategy record', () => {
    resolveOptions('auto', { pixelPerfect: true });
    expect(STRATEGIES.find((s) => s.id === 'auto')!.options.pixelPerfect).toBe(false);
  });
});
