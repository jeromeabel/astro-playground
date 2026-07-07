import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { passthroughImageService } from 'astro/config';
import { fileURLToPath } from 'node:url';
import type { ImageMetadata } from 'astro';
import CustomImage from '../components/CustomImage.astro';
import { gallery } from '../data/gallery';
import { resolveOptions } from '../lib/strategies';

// Wiring smokes only: does the emitted HTML carry the plan's decisions?
// The decisions themselves are unit-tested in render-plan.test.ts; the async
// LQIP build in lqip.test.ts; full-output regression in html-parity.test.ts.

const fakeImage = {
  src: '/src/assets/optimg/photo-01.jpg',
  width: 1280,
  height: 853,
  format: 'jpg',
  fsPath: fileURLToPath(new URL('../../../assets/optimg/photo-01.jpg', import.meta.url)),
} as ImageMetadata;

const item = gallery[0]; // photo-01, item.crop is undefined (falsy)
const croppedItem = { ...item, crop: true };

describe('CustomImage — plan-to-HTML wiring smokes', () => {
  let container: Awaited<ReturnType<typeof AstroContainer.create>>;

  beforeAll(async () => {
    container = await AstroContainer.create({
      astroConfig: { image: { service: passthroughImageService() } },
    });
  });

  it('source:raw → bare <img>, no srcset, no loading attr (browser-default eager by design)', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, strategy: 'naive', type: 'thumb', image: fakeImage },
    });
    expect(html).toContain('<img');
    expect(html).not.toContain('srcset');
    expect(html).not.toContain('loading=');
  });

  it('source:public → /manual/ src + 4-width srcset + loading/fetchpriority wired', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, strategy: 'manual', type: 'thumb', image: fakeImage, index: 6 },
    });
    expect(html).toContain(`/manual/${item.id}-1280.jpg`);
    expect(html).toContain(`/manual/${item.id}-640.jpg 640w`);
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('fetchpriority="auto"');
  });

  it('source:picture wires loading/fetchpriority from the plan (cover = eager + high)', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, strategy: 'auto', type: 'cover', image: fakeImage },
    });
    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchpriority="high"');
  });

  it('pixel-perfect wires exact sizes + widths into the srcset', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, strategy: 'pixel-perfect', type: 'thumb', image: fakeImage, index: 6 },
    });
    expect(html).toContain('min-width: 1024px'); // exact grid sizes string
    expect(html).toContain('srcset');
  });

  it('lqip below-fold wires placeholder + fade: data: URI, reveal-img, opacity:0', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, strategy: 'lqip', type: 'thumb', image: fakeImage, index: 99 },
    });
    const placeholderImgTag = html.match(/<img[^>]*aria-hidden="true"[^>]*>/)?.[0] ?? '';
    expect(placeholderImgTag).toMatch(/src="data:image\/webp;base64,[^"]+"/);
    expect(placeholderImgTag).not.toContain('/.netlify/images');
    expect(html).toContain('reveal-img');
    expect(html).toContain('opacity:0');
  });

  it('lqip above-fold (LCP) wires the no-fade plan: placeholder present, no reveal-img, no opacity:0', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, strategy: 'lqip', type: 'thumb', image: fakeImage, index: 0 },
    });
    expect(html).toMatch(/src="data:image\/webp;base64,[^"]+"/);
    expect(html).not.toContain('reveal-img');
    expect(html).not.toContain('opacity:0');
  });

  it('placeholder:"skeleton" wires the grey box, not an lqip <img>', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, type: 'thumb', image: fakeImage, options: resolveOptions('auto', { placeholder: 'skeleton' }) },
    });
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toMatch(/<img[^>]*aria-hidden/);
    expect(html).not.toContain('data:image');
  });

  it('final wires crop geometry when item.crop === true (position top + 4:3 height)', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item: croppedItem, strategy: 'final', type: 'thumb', image: fakeImage, index: 6 },
    });
    expect(html).toContain('data-astro-image-pos="top"');
    expect(html).toContain('height="361"');
  });

  it('debug:true wires the data-optimg-debug hook attribute', async () => {
    const html = await container.renderToString(CustomImage, {
      props: { item, type: 'thumb', image: fakeImage, options: resolveOptions('auto', { debug: true }) },
    });
    expect(html).toContain('data-optimg-debug');
  });
});
