import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import PlaceholderBox from '../components/PlaceholderBox.astro';

const CHILD = '<span data-child>x</span>';
const DATA_URI = 'data:image/webp;base64,AAAA';

describe('PlaceholderBox — kind matrix', () => {
  let container: Awaited<ReturnType<typeof AstroContainer.create>>;

  beforeAll(async () => {
    container = await AstroContainer.create();
  });

  it('none → slot only, no extra DOM', async () => {
    const html = await container.renderToString(PlaceholderBox, {
      props: { kind: 'none', fade: false },
      slots: { default: CHILD },
    });
    expect(html).toContain('data-child');
    expect(html).not.toContain('<div');
    expect(html).not.toContain('aria-hidden');
  });

  it('skeleton → grey box behind the slot, no <img>', async () => {
    const html = await container.renderToString(PlaceholderBox, {
      props: { kind: 'skeleton', fade: false },
      slots: { default: CHILD },
    });
    expect(html).toContain('data-child');
    expect(html).toContain('bg-zinc-200');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('<img');
  });

  it('lqip + fade → reveal-img wrapper with aria-hidden placeholder <img>', async () => {
    const html = await container.renderToString(PlaceholderBox, {
      props: { kind: 'lqip', placeholder: DATA_URI, fade: true },
      slots: { default: CHILD },
    });
    expect(html).toContain('reveal-img');
    expect(html).toMatch(/<img[^>]*aria-hidden="true"[^>]*src="data:image\/webp;base64,AAAA"/);
    expect(html).toContain('data-child');
  });

  it('lqip without fade → wrapper has NO reveal-img class (cache-guarded fade is opt-in)', async () => {
    const html = await container.renderToString(PlaceholderBox, {
      props: { kind: 'lqip', placeholder: DATA_URI, fade: false },
      slots: { default: CHILD },
    });
    expect(html).not.toContain('reveal-img');
    expect(html).toContain('relative overflow-hidden');
    expect(html).toContain('data:image/webp;base64,AAAA');
  });
});
