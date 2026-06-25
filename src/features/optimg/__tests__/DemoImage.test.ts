import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { passthroughImageService } from 'astro/config';
import type { ImageMetadata } from 'astro';
import DemoImage from '../components/DemoImage.astro';
import { gallery } from '../data/gallery';
import { STRATEGY_IDS } from '../lib/strategies';

const fakeImage = {
  src: '/src/assets/optimg/photo-01.jpg',
  width: 1280,
  height: 853,
  format: 'jpg',
} as ImageMetadata;

const item = gallery[0]; // photo-01

describe('DemoImage — Layer 2 Container API', () => {
  let container: Awaited<ReturnType<typeof AstroContainer.create>>;

  beforeAll(async () => {
    container = await AstroContainer.create({
      astroConfig: {
        image: { service: passthroughImageService() },
      },
    });
  });

  // --- naive: bare <img>, no srcset, no loading ---
  it('naive/thumb renders a bare <img> with no srcset or loading', async () => {
    const html = await container.renderToString(DemoImage, {
      props: { item, strategy: 'naive', type: 'thumb', image: fakeImage },
    });
    expect(html).toContain('<img');
    expect(html).not.toContain('srcset');
    expect(html).not.toContain('loading=');
  });

  // --- loading attribute per type ---
  it('auto/thumb emits loading="lazy"', async () => {
    const html = await container.renderToString(DemoImage, {
      props: { item, strategy: 'auto', type: 'thumb', image: fakeImage },
    });
    expect(html).toContain('loading="lazy"');
  });

  it('auto/cover emits loading="eager" and fetchpriority="high"', async () => {
    const html = await container.renderToString(DemoImage, {
      props: { item, strategy: 'auto', type: 'cover', image: fakeImage },
    });
    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchpriority="high"');
  });

  // --- srcset + sizes for advanced strategies ---
  it('pixel-perfect/thumb emits srcset and sizes', async () => {
    const html = await container.renderToString(DemoImage, {
      props: { item, strategy: 'pixel-perfect', type: 'thumb', image: fakeImage },
    });
    expect(html).toContain('srcset');
    expect(html).toContain('sizes');
  });

  it('final/thumb emits srcset and sizes', async () => {
    const html = await container.renderToString(DemoImage, {
      props: { item, strategy: 'final', type: 'thumb', image: fakeImage },
    });
    expect(html).toContain('srcset');
    expect(html).toContain('sizes');
  });

  // --- LQIP/final placeholder ---
  it('lqip/thumb emits aria-hidden placeholder <img>', async () => {
    const html = await container.renderToString(DemoImage, {
      props: { item, strategy: 'lqip', type: 'thumb', image: fakeImage },
    });
    expect(html).toContain('aria-hidden="true"');
  });

  it('final/thumb emits aria-hidden placeholder <img>', async () => {
    const html = await container.renderToString(DemoImage, {
      props: { item, strategy: 'final', type: 'thumb', image: fakeImage },
    });
    expect(html).toContain('aria-hidden="true"');
  });

  // --- index-based loading/fetchpriority (Task D) ---
  // index=0  → eager + high  (the single LCP cell)
  // index<6  → eager + auto  (above-fold, not LCP — don't dilute the high signal)
  // index≥6  → lazy  + auto  (below-fold)
  // naive emits no loading attr on purpose (browser-default eager → all 20 upfront).
  // cover slots stay eager+high regardless of index (asserted above).
  const nonNaive = STRATEGY_IDS.filter((s) => s !== 'naive');

  it.each(nonNaive)('%s/thumb index=0 emits loading="eager" fetchpriority="high" (LCP)', async (strategy) => {
    const html = await container.renderToString(DemoImage, {
      props: { item, strategy, type: 'thumb', image: fakeImage, index: 0 },
    });
    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchpriority="high"');
  });

  it.each(nonNaive)('%s/thumb index=3 emits loading="eager" fetchpriority="auto" (above-fold)', async (strategy) => {
    const html = await container.renderToString(DemoImage, {
      props: { item, strategy, type: 'thumb', image: fakeImage, index: 3 },
    });
    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchpriority="auto"');
  });

  it.each(nonNaive)('%s/thumb index=6 emits loading="lazy" (below-fold)', async (strategy) => {
    const html = await container.renderToString(DemoImage, {
      props: { item, strategy, type: 'thumb', image: fakeImage, index: 6 },
    });
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('fetchpriority="auto"');
  });

  it('naive/thumb has no loading attribute (browser-default eager by design)', async () => {
    const html = await container.renderToString(DemoImage, {
      props: { item, strategy: 'naive', type: 'thumb', image: fakeImage },
    });
    expect(html).not.toContain('loading=');
  });
});
