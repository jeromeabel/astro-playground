import { describe, it, expect } from 'vitest';
import { verdict, servedWidth } from '@optimg/scripts/img-audit';

describe('verdict — thresholds', () => {
  it('returns ok when got equals need', () => {
    expect(verdict(500, 500).mark).toBe('✓ ok');
  });

  it('returns ok when got is 1px below need (boundary)', () => {
    // condition is got < need - 1; 499 < 499 is false → ok
    expect(verdict(499, 500).mark).toBe('✓ ok');
  });

  it('returns short when got is more than 1px below need', () => {
    // 498 < 499 → short
    expect(verdict(498, 500).mark).toBe('✗ short');
  });

  it('returns ok at exactly 125% of need', () => {
    // 500 * 1.25 = 625; 625 > 625 is false → ok
    expect(verdict(625, 500).mark).toBe('✓ ok');
  });

  it('returns over when got exceeds 125% of need', () => {
    // 626 > 625 → over
    expect(verdict(626, 500).mark).toBe('≫ over');
  });
});

describe('verdict — colors', () => {
  it('short uses red', () => {
    expect(verdict(498, 500).color).toBe('#dc2626');
  });

  it('over uses amber', () => {
    expect(verdict(626, 500).color).toBe('#d97706');
  });

  it('ok uses green', () => {
    expect(verdict(500, 500).color).toBe('#16a34a');
  });
});

describe('servedWidth — w param extraction', () => {
  it('extracts w from a relative query-only URL', () => {
    const result = servedWidth({ currentSrc: '?w=704', naturalWidth: 500 });
    expect(result).toEqual({ got: 704, fromParam: true });
  });

  it('extracts w from a full Netlify CDN URL', () => {
    const result = servedWidth({
      currentSrc: 'https://example.com/.netlify/images?url=test.jpg&w=352',
      naturalWidth: 1280,
    });
    expect(result).toEqual({ got: 352, fromParam: true });
  });
});

describe('servedWidth — naturalWidth fallback', () => {
  it('falls back to naturalWidth when no w param in URL', () => {
    const result = servedWidth({ currentSrc: '/image.jpg', naturalWidth: 500 });
    expect(result).toEqual({ got: 500, fromParam: false });
  });

  it('falls back to naturalWidth when currentSrc is empty', () => {
    const result = servedWidth({ currentSrc: '', naturalWidth: 400 });
    expect(result).toEqual({ got: 400, fromParam: false });
  });
});
