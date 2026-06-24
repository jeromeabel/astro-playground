import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { passthroughImageService } from 'astro/config';
import type { ImageMetadata } from 'astro';
import DemoImage from '../components/DemoImage.astro';
import { gallery } from '../data/gallery';

const fakeImage = {
  src: '/src/assets/demo/photo-01.jpg',
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

  // --- below-fold: thumb vs cover lazy guard (Task D) ---
  it('manual/thumb emits loading="lazy" and has srcset', async () => {
    const html = await container.renderToString(DemoImage, {
      props: { item, strategy: 'manual', type: 'thumb' },
    });
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('srcset');
  });

  it('naive/thumb has no loading attribute (browser-default eager)', async () => {
    const html = await container.renderToString(DemoImage, {
      props: { item, strategy: 'naive', type: 'thumb', image: fakeImage },
    });
    expect(html).not.toContain('loading=');
  });
});
