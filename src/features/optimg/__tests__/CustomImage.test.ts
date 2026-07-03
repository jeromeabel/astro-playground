import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { passthroughImageService } from 'astro/config';
import { fileURLToPath } from 'node:url';
import type { ImageMetadata } from 'astro';
import CustomImage from '../components/CustomImage.astro';
import { gallery } from '../data/gallery';
import { STRATEGY_IDS } from '../lib/strategies';
import { resolveOptions } from '../lib/presets';

// `fsPath` isn't in the public ImageMetadata type (it's a non-enumerable
// runtime property astro:assets attaches to real ESM image imports), but
// the "final"/"lqip" presets will eventually read it to build the inline
// base64 LQIP placeholder (Task 4) — point it at the real committed source
// so the Container API render can actually run over it.
const fakeImage = {
  src: '/src/assets/optimg/photo-01.jpg',
  width: 1280,
  height: 853,
  format: 'jpg',
  fsPath: fileURLToPath(new URL('../../../assets/optimg/photo-01.jpg', import.meta.url)),
} as ImageMetadata;

const item = gallery[0]; // photo-01, item.crop is undefined (falsy)
const croppedItem = { ...item, crop: true };

describe('CustomImage — Layer 2 Container API', () => {
  let container: Awaited<ReturnType<typeof AstroContainer.create>>;

  beforeAll(async () => {
    container = await AstroContainer.create({
      astroConfig: {
        image: { service: passthroughImageService() },
      },
    });
  });

  // =========================================================================
  // Migrated from DemoImage.test.ts — same behavior must still hold, driven
  // through `strategy` -> resolveOptions() rather than a strategy === switch.
  // =========================================================================

  it('naive/thumb renders a bare <img> with no srcset or loading', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, strategy: 'naive', type: 'thumb', image: fakeImage },
    });
    expect(html).toContain('<img');
    expect(html).not.toContain('srcset');
    expect(html).not.toContain('loading=');
  });

  it('auto/thumb emits loading="lazy"', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, strategy: 'auto', type: 'thumb', image: fakeImage },
    });
    expect(html).toContain('loading="lazy"');
  });

  it('auto/cover emits loading="eager" and fetchpriority="high"', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, strategy: 'auto', type: 'cover', image: fakeImage },
    });
    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchpriority="high"');
  });

  it('pixel-perfect/thumb emits srcset and sizes', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, strategy: 'pixel-perfect', type: 'thumb', image: fakeImage },
    });
    expect(html).toContain('srcset');
    expect(html).toContain('sizes');
  });

  it('final/thumb emits srcset and sizes', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, strategy: 'final', type: 'thumb', image: fakeImage },
    });
    expect(html).toContain('srcset');
    expect(html).toContain('sizes');
  });

  it('lqip/thumb emits aria-hidden placeholder', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, strategy: 'lqip', type: 'thumb', image: fakeImage },
    });
    expect(html).toContain('aria-hidden="true"');
  });

  it('final/thumb emits aria-hidden placeholder', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, strategy: 'final', type: 'thumb', image: fakeImage },
    });
    expect(html).toContain('aria-hidden="true"');
  });

  const nonNaive = STRATEGY_IDS.filter((s) => s !== 'naive');

  it.each(nonNaive)('%s/thumb index=0 emits loading="eager" fetchpriority="high" (LCP)', async (strategy) => {
    const html = await container.renderToString(CustomImage, {
      props: { item, strategy, type: 'thumb', image: fakeImage, index: 0 },
    });
    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchpriority="high"');
  });

  it.each(nonNaive)('%s/thumb index=3 emits loading="eager" fetchpriority="auto" (above-fold)', async (strategy) => {
    const html = await container.renderToString(CustomImage, {
      props: { item, strategy, type: 'thumb', image: fakeImage, index: 3 },
    });
    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchpriority="auto"');
  });

  it.each(nonNaive)('%s/thumb index=6 emits loading="lazy" (below-fold)', async (strategy) => {
    const html = await container.renderToString(CustomImage, {
      props: { item, strategy, type: 'thumb', image: fakeImage, index: 6 },
    });
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('fetchpriority="auto"');
  });

  it('naive/thumb has no loading attribute (browser-default eager by design)', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, strategy: 'naive', type: 'thumb', image: fakeImage },
    });
    expect(html).not.toContain('loading=');
  });

  // =========================================================================
  // New: orthogonal-option matrix — options combine independently of any
  // named strategy. Pass raw `options` bundles, not just `strategy`.
  // =========================================================================

  it('source:raw → bare <img>, no srcset, no loading', async () => {
    const html = await container.renderToString(CustomImage, {
      props: {
        item,
        type: 'thumb',
        image: fakeImage,
        options: { source: 'raw', debug: false, placeholder: 'none', animation: false, pixelPerfect: false, crop: false },
      },
    });
    expect(html).toContain('<img');
    expect(html).not.toContain('srcset');
    expect(html).not.toContain('loading=');
  });

  it('source:public → /manual/ src + srcset', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, strategy: 'manual', type: 'thumb', image: fakeImage },
    });
    expect(html).toContain(`/manual/${item.id}-1280.jpg`);
    expect(html).toContain('srcset');
  });

  it('aboveFold:true forces loading="eager" even at index=99', async () => {
    const html = await container.renderToString(CustomImage, {
      props: {
        item,
        type: 'thumb',
        image: fakeImage,
        index: 99,
        options: { ...resolveOptions('auto'), aboveFold: true },
      },
    });
    expect(html).toContain('loading="eager"');
  });

  it('aboveFold:false forces loading="lazy" even at index=0', async () => {
    const html = await container.renderToString(CustomImage, {
      props: {
        item,
        type: 'thumb',
        image: fakeImage,
        index: 0,
        options: { ...resolveOptions('auto'), aboveFold: false },
      },
    });
    expect(html).toContain('loading="lazy"');
  });

  it('pixelPerfect:true emits exact grid sizes; false emits approx 33vw', async () => {
    const ppHtml = await container.renderToString(CustomImage, {
      props: { item, type: 'thumb', image: fakeImage, options: resolveOptions('auto', { pixelPerfect: true }) },
    });
    const approxHtml = await container.renderToString(CustomImage, {
      props: { item, type: 'thumb', image: fakeImage, options: resolveOptions('auto', { pixelPerfect: false }) },
    });
    expect(ppHtml).toContain('min-width: 1024px');
    expect(approxHtml).toContain('33vw');
    expect(approxHtml).not.toContain('min-width: 1024px');
  });

  it('crop:true + pixelPerfect:false → fit=cover, height=480 (coarse, unconditional)', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, type: 'thumb', image: fakeImage, options: resolveOptions('cropped') },
    });
    expect(html).toContain('height="480"');
  });

  // Astro's <Picture> always emits a computed `height` attribute (derived
  // from the source's natural aspect ratio) and defaults fit="cover" even
  // when we pass neither — so `position="top"` (only set by OUR crop logic)
  // plus the differing numeric height (natural 321 vs cropped 4:3 -> 361 for
  // the grid slot width) are the reliable "did we crop" signals here.
  it('crop:true + pixelPerfect:true honors item.crop (final): crops when item.crop===true', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item: croppedItem, type: 'thumb', image: fakeImage, options: resolveOptions('final') },
    });
    expect(html).toContain('data-astro-image-pos="top"');
    expect(html).toContain('height="361"');
  });

  it('crop:true + pixelPerfect:true does NOT crop when item.crop is not true', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, type: 'thumb', image: fakeImage, options: resolveOptions('final') },
    });
    expect(html).not.toContain('data-astro-image-pos="top"');
    expect(html).toContain('data-astro-image-pos="center"');
    expect(html).toContain('height="321"');
  });

  it('placeholder:"skeleton" → skeleton box, NO aria-hidden lqip <img>, NO data:image', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, type: 'thumb', image: fakeImage, options: resolveOptions('auto', { placeholder: 'skeleton' }) },
    });
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toMatch(/<img[^>]*aria-hidden/);
    expect(html).not.toContain('data:image');
  });

  it('placeholder:"none" → no placeholder box at all', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, type: 'thumb', image: fakeImage, options: resolveOptions('auto') },
    });
    expect(html).not.toContain('aria-hidden');
  });

  it('resolveOptions("auto",{pixelPerfect:true}) renders picture with exact sizes + no placeholder', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, type: 'thumb', image: fakeImage, options: resolveOptions('auto', { pixelPerfect: true }) },
    });
    expect(html).toContain('min-width: 1024px');
    expect(html).not.toContain('aria-hidden');
  });

  // placeholder:"lqip" data-URI (base64) inlining is Task 4 — deferred here.
  it.todo('placeholder:"lqip" inlines a base64 data:image/webp;base64 blurred placeholder');

  it('debug:true adds the data-optimg-debug hook attribute (picture source)', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, type: 'thumb', image: fakeImage, options: resolveOptions('auto', { debug: true }) },
    });
    expect(html).toContain('data-optimg-debug');
  });

  it('debug:false (default) does not add the data-optimg-debug attribute', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, type: 'thumb', image: fakeImage, options: resolveOptions('auto') },
    });
    expect(html).not.toContain('data-optimg-debug');
  });
});
