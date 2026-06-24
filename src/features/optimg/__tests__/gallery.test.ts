import { describe, it, expect } from 'vitest';
import { gallery } from '../data/gallery';

describe('gallery', () => {
  it('has exactly 21 items', () => {
    expect(gallery).toHaveLength(21);
  });

  it('all ids are unique', () => {
    const ids = gallery.map((item) => item.id);
    expect(new Set(ids).size).toBe(21);
  });

  it('all source values are "picsum"', () => {
    for (const item of gallery) {
      expect(item.source, `source for ${item.id}`).toBe('picsum');
    }
  });

  it('all items have an overlay', () => {
    for (const item of gallery) {
      expect(item.overlay, `overlay for ${item.id}`).toBeDefined();
    }
  });

  it('all author fields are non-empty', () => {
    for (const item of gallery) {
      expect(item.author.length, `author for ${item.id}`).toBeGreaterThan(0);
    }
  });

  it('all authorUrl fields are non-empty HTTPS URLs', () => {
    for (const item of gallery) {
      expect(item.authorUrl, `authorUrl for ${item.id}`).toMatch(/^https?:\/\//);
    }
  });

  it('all alt fields are non-empty', () => {
    for (const item of gallery) {
      expect(item.alt.length, `alt for ${item.id}`).toBeGreaterThan(0);
    }
  });

  it('crop when present is a boolean', () => {
    for (const item of gallery) {
      if (item.crop !== undefined) {
        expect(typeof item.crop, `crop type for ${item.id}`).toBe('boolean');
      }
    }
  });

  it('overlay is one of the valid values', () => {
    const valid = ['a', 'b', 'c', 'combo', 'd', 'e'];
    for (const item of gallery) {
      expect(valid, `overlay for ${item.id}`).toContain(item.overlay);
    }
  });
});
