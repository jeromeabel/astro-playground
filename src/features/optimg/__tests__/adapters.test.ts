import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { passthroughImageService } from 'astro/config';
import { fileURLToPath } from 'node:url';
import type { ImageMetadata } from 'astro';
import RawImage from '@optimg/components/RawImage.astro';
import ManualImage from '@optimg/components/ManualImage.astro';
import PictureImage from '@optimg/components/PictureImage.astro';
import { renderPlan } from '@optimg/lib/render-plan';
import { resolveOptions } from '@optimg/lib/strategies';

const fakeImage = {
  src: '/src/assets/optimg/photo-01.jpg',
  width: 1280,
  height: 853,
  format: 'jpg',
  fsPath: fileURLToPath(new URL('../../../assets/optimg/photo-01.jpg', import.meta.url)),
} as ImageMetadata;

describe('source adapters', () => {
  let container: Awaited<ReturnType<typeof AstroContainer.create>>;

  beforeAll(async () => {
    container = await AstroContainer.create({
      astroConfig: { image: { service: passthroughImageService() } },
    });
  });

  it('RawImage → bare <img>, no srcset, no loading (the measurement floor)', async () => {
    const html = await container.renderToString(RawImage, {
      props: { image: fakeImage, alt: 'photo' },
    });
    expect(html).toContain('<img');
    expect(html).not.toContain('srcset');
    expect(html).not.toContain('loading=');
  });

  it('ManualImage → /manual/ src, 4-width srcset, explicit width/height, baked blur background', async () => {
    const plan = renderPlan(resolveOptions('manual'), { ctx: 'grid', index: 6 });
    const html = await container.renderToString(ManualImage, {
      props: { plan, id: 'photo-01', alt: 'photo' },
    });
    expect(html).toContain('/manual/photo-01-1280.jpg');
    expect(html).toContain('/manual/photo-01-640.jpg 640w');
    expect(html).toContain('width="640"');
    expect(html).toContain('height="427"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('background-image:url(/manual/photo-01-blur.jpg)');
  });

  it('ManualImage cover → 1280×853 eager', async () => {
    const plan = renderPlan(resolveOptions('manual'), { ctx: 'cover' });
    const html = await container.renderToString(ManualImage, {
      props: { plan, id: 'photo-01', alt: 'photo' },
    });
    expect(html).toContain('width="1280"');
    expect(html).toContain('height="853"');
    expect(html).toContain('loading="eager"');
  });

  it('PictureImage plain (auto) → <picture> with srcset, no wrapper, no placeholder', async () => {
    const plan = renderPlan(resolveOptions('auto'), { ctx: 'grid', index: 6 });
    const html = await container.renderToString(PictureImage, {
      props: { plan, image: fakeImage, alt: 'photo' },
    });
    expect(html).toContain('<picture');
    expect(html).toContain('srcset');
    expect(html).not.toContain('aria-hidden');
  });

  it('PictureImage lqip below-fold → reveal-img wrapper + data: placeholder + opacity:0 picture', async () => {
    const plan = renderPlan(resolveOptions('lqip'), { ctx: 'grid', index: 99 });
    const html = await container.renderToString(PictureImage, {
      props: { plan, image: fakeImage, alt: 'photo' },
    });
    expect(html).toContain('reveal-img');
    expect(html).toMatch(/<img[^>]*aria-hidden="true"[^>]*src="data:image\/webp;base64,[^"]+"/);
    expect(html).toContain('opacity:0');
  });

  it('PictureImage skeleton → grey box wrapper, no data: URI', async () => {
    const plan = renderPlan(resolveOptions('auto', { placeholder: 'skeleton' }), { ctx: 'grid', index: 6 });
    const html = await container.renderToString(PictureImage, {
      props: { plan, image: fakeImage, alt: 'photo' },
    });
    expect(html).toContain('bg-zinc-200');
    expect(html).not.toContain('data:image');
  });
});
