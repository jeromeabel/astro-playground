import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import BenchmarkResults from '../components/BenchmarkResults.astro';
import type { BenchmarkView } from '../lib/benchmark';

const view: BenchmarkView = {
  mode: 'desktop',
  generatedAt: '2026-07-04T00:04:39.500Z',
  hasData: true,
  rows: [
    { strategy: 'naive', lcpMs: 526, cls: 0.004, kb: 9136, isBestLcp: true, isWorstLcp: false, isBestBytes: false },
    { strategy: 'final', lcpMs: 720, cls: 0.004, kb: 278, isBestLcp: false, isWorstLcp: true, isBestBytes: true },
  ],
  findings: [
    { id: 'bytes-winner', ppKb: 273, finalKb: 278, autoKb: 605 },
    { id: 'lqip-lcp', lqipLcp: 900, autoLcp: 690 },
    { id: 'manual-lcp', manualLcp: 555 },
    { id: 'final-pick', finalKb: 278, deltaMs: 80 },
  ],
};

const emptyView: BenchmarkView = {
  mode: 'desktop', generatedAt: null, hasData: false, rows: [], findings: [],
};

describe('BenchmarkResults', () => {
  let container: Awaited<ReturnType<typeof AstroContainer.create>>;

  beforeAll(async () => {
    container = await AstroContainer.create();
  });

  it('renders a table row per view row with flags styled', async () => {
    const html = await container.renderToString(BenchmarkResults, { props: { view } });
    expect(html).toContain('href="/optimg/naive"');
    expect(html).toContain('href="/optimg/final"');
    expect(html).toContain('526');            // lcp cell
    expect(html).toContain('0.004');           // cls cell, toFixed(3)
    expect(html).toContain('9136');            // kb cell (pre-rounded by the lib)
    expect(html).toContain('text-emerald-600'); // best flag styling present
    expect(html).toContain('text-red-500');     // worst flag styling present
  });

  it('renders findings with numbers interpolated and <code>/<em> markup preserved', async () => {
    const html = await container.renderToString(BenchmarkResults, { props: { view } });
    expect(html).toContain('Key findings');
    // headlines
    expect(html).toContain('Bytes wins go to pixel-perfect and final');
    expect(html).toContain('LQIP does not improve LCP');
    expect(html).toContain('final is the production pick');
    // numbers from the view
    expect(html).toContain('273 KB and 278 KB');
    expect(html).toContain('(605 KB)');
    expect(html).toContain('(900 ms)');
    expect(html).toContain('The 80 ms');
    // markup preserved (the metrics-in-findings payoff vs plain strings)
    expect(html).toContain('<code>auto</code>');
    expect(html).toContain('<code>naive</code>');
    expect(html).toContain('<em>full</em>');
    expect(html).toContain('<code>/.netlify/images</code>');
  });

  it('empty view → empty-state copy, no table, no findings box', async () => {
    const html = await container.renderToString(BenchmarkResults, { props: { view: emptyView } });
    expect(html).toContain('No measurements yet');
    expect(html).not.toContain('<table');
    expect(html).not.toContain('Key findings');
  });
});
