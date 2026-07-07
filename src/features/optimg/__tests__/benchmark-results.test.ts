import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import BenchmarkResults from '@optimg/components/BenchmarkResults.astro';
import type { BenchmarkView, BenchmarkCompare } from '@optimg/lib/benchmark';

const view: BenchmarkView = {
  mode: 'desktop',
  generatedAt: '2026-07-04T00:04:39.500Z',
  runs: 5,
  hasData: true,
  rows: [
    { strategy: 'naive', lcpMs: 526, cls: 0.004, kb: 9136, isBestLcp: true, isWorstLcp: false, isBestBytes: false },
    { strategy: 'final', lcpMs: 720, cls: 0.004, kb: 278, isBestLcp: false, isWorstLcp: true, isBestBytes: true },
  ],
  findings: [
    { id: 'bytes-winner', ppKb: 273, finalKb: 278, autoKb: 605, pctUnderAuto: 55, pctUnderNaive: 97 },
    { id: 'lqip-lcp', lqipLcp: 900, autoLcp: 690, deltaMs: 210 },
    { id: 'final-pick', finalKb: 278, deltaMs: 80 },
  ],
};

const emptyView: BenchmarkView = {
  mode: 'desktop', generatedAt: null, runs: null, hasData: false, rows: [], findings: [],
};

const compare: BenchmarkCompare = {
  hasData: true,
  rows: [
    { strategy: 'auto', desktopKb: 729, mobileKb: 610, desktopLcpMs: 362, mobileLcpMs: 3794, flip: 'lighter-on-mobile' },
    { strategy: 'pixel-perfect', desktopKb: 234, mobileKb: 926, desktopLcpMs: 326, mobileLcpMs: 4494, flip: 'heavier-on-mobile' },
  ],
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

  it('renders the caption with the run count from the view (not a literal)', async () => {
    const html = await container.renderToString(BenchmarkResults, { props: { view } });
    expect(html).toContain('5 runs');       // view.runs = 5, warm-cache dual-mode set
    expect(html).toContain('Warm-cache');   // not "Cold-cache"
    expect(html).not.toContain('3 runs');
  });

  it('renders findings with numbers interpolated and <code>/<em> markup preserved', async () => {
    const html = await container.renderToString(BenchmarkResults, { props: { view } });
    expect(html).toContain('Key findings');
    // headlines
    expect(html).toContain('Bytes wins go to pixel-perfect and final');
    expect(html).toContain('LQIP does not improve LCP');
    expect(html).toContain('final is the production pick');
    // the disproven "manual wins LCP" finding is gone
    expect(html).not.toContain('manual wins LCP');
    // derived numbers from the view
    expect(html).toContain('273 KB and 278 KB');
    expect(html).toContain('~55% under');       // pctUnderAuto, computed
    expect(html).toContain('97% under');        // pctUnderNaive, computed
    expect(html).toContain('(605 KB)');
    expect(html).toContain('~210 ms over');     // lqip deltaMs, computed
    expect(html).toContain('(900 ms)');
    expect(html).toContain('The 80 ms');
    // markup preserved (the metrics-in-findings payoff vs plain strings)
    expect(html).toContain('<code>auto</code>');
    expect(html).toContain('<code>naive</code>');
    expect(html).toContain('<em>snaps</em>');
    expect(html).toContain('<em>perceived</em>');
  });

  it('labels the primary table as desktop', async () => {
    const html = await container.renderToString(BenchmarkResults, { props: { view } });
    expect(html).toContain('Measured results — desktop');
  });

  it('renders the desktop↔mobile compare block when compare is passed', async () => {
    const html = await container.renderToString(BenchmarkResults, { props: { view, compare } });
    expect(html).toContain('Desktop vs mobile');
    // each row: desktop KB then mobile KB, with the flip colored on the mobile cell
    expect(html).toContain('729');   // auto desktop
    expect(html).toContain('610');   // auto mobile (lighter)
    expect(html).toContain('234');   // pixel-perfect desktop
    expect(html).toContain('926');   // pixel-perfect mobile (heavier)
    expect(html).toContain('text-emerald-600'); // lighter-on-mobile flag
    expect(html).toContain('text-red-500');     // heavier-on-mobile flag
  });

  it('omits the compare block when compare is absent', async () => {
    const html = await container.renderToString(BenchmarkResults, { props: { view } });
    expect(html).not.toContain('Desktop vs mobile');
  });

  it('empty view → empty-state copy, no table, no findings box', async () => {
    const html = await container.renderToString(BenchmarkResults, { props: { view: emptyView } });
    expect(html).toContain('No measurements yet');
    expect(html).not.toContain('<table');
    expect(html).not.toContain('Key findings');
  });
});
