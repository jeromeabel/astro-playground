import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { passthroughImageService } from 'astro/config';
import { fileURLToPath } from 'node:url';
import type { ImageMetadata } from 'astro';
import CustomImage from '../components/CustomImage.astro';
import { gallery } from '../data/gallery';
import { STRATEGY_IDS } from '../lib/strategies';

// Same fixture shape as CustomImage.test.ts: real committed source so the
// LQIP sharp pass can run.
const fakeImage = {
  src: '/src/assets/optimg/photo-01.jpg',
  width: 1280,
  height: 853,
  format: 'jpg',
  fsPath: fileURLToPath(new URL('../../../assets/optimg/photo-01.jpg', import.meta.url)),
} as ImageMetadata;

const item = gallery[0];
const croppedItem = { ...item, crop: true };

// Every strategy × the render contexts the routes actually hit:
// grid LCP card (index 0), grid below-fold card (index 6), cover page, and
// the per-item crop opt-in that only `final` distinguishes.
const CASES = STRATEGY_IDS.flatMap((strategy) => [
  { name: `${strategy}/thumb-0`, props: { item, strategy, type: 'thumb', image: fakeImage, index: 0 } },
  { name: `${strategy}/thumb-6`, props: { item, strategy, type: 'thumb', image: fakeImage, index: 6 } },
  { name: `${strategy}/thumb-6-crop`, props: { item: croppedItem, strategy, type: 'thumb', image: fakeImage, index: 6 } },
  { name: `${strategy}/cover`, props: { item, strategy, type: 'cover', image: fakeImage } },
]);

describe('HTML parity — refactor guard (C1/C3 must not change output)', () => {
  let container: Awaited<ReturnType<typeof AstroContainer.create>>;

  beforeAll(async () => {
    container = await AstroContainer.create({
      astroConfig: { image: { service: passthroughImageService() } },
    });
  });

  it.each(CASES)('$name renders identical HTML', async ({ props }) => {
    const html = await container.renderToString(CustomImage, { props: props as never });
    expect(html).toMatchSnapshot();
  });
});
