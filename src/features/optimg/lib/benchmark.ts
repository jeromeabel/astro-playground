// Benchmark view-model: raw benchmark JSON (unknown) in, a structured
// BenchmarkView out — ranked row flags, the run count, plus the narrative
// findings' NUMBERS (percentages and LCP deltas DERIVED here, never typed as
// literals in the prose, so they can't drift when the JSON is re-measured).
// The hub page and <BenchmarkResults> both consume the view; neither re-derives.
// Every lookup is safe: a finding that references a missing strategy is OMITTED,
// not crashed (the old inline JSX used `.find(...)!` ~10×, each a latent build
// crash when a strategy is renamed or dropped). No prose lives here — the
// component owns the copy + <code>/<em> markup and interpolates these numbers.

export type BenchMode = "desktop" | "mobile";

export interface BenchmarkRowView {
  strategy: string;
  lcpMs: number;
  lcpMinMs: number | null;
  lcpMaxMs: number | null;
  cls: number;
  kb: number;
  isBestLcp: boolean;
  isWorstLcp: boolean;
  isBestBytes: boolean;
}

export type Finding =
  | {
      id: "bytes-winner";
      ppKb: number;
      finalKb: number;
      autoKb: number;
      pctUnderAuto: number;
      pctUnderNaive: number;
    }
  | { id: "lqip-lcp"; lqipLcp: number; autoLcp: number; deltaMs: number }
  | { id: "final-pick"; finalKb: number; deltaMs: number };

export interface BenchmarkView {
  mode: BenchMode;
  generatedAt: string | null;
  runs: number | null;
  hasData: boolean;
  rows: BenchmarkRowView[];
  findings: Finding[];
}

interface RawRow {
  strategy: string;
  lcpMs: number;
  lcpMinMs?: number;
  lcpMaxMs?: number;
  cls: number;
  bytes: number;
  imageBytes?: number;
  runs?: number;
}

function isRawRow(value: unknown): value is RawRow {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.strategy === "string" &&
    typeof r.lcpMs === "number" &&
    typeof r.cls === "number" &&
    typeof r.bytes === "number"
  );
}

export function analyzeBenchmark(data: unknown, mode: BenchMode): BenchmarkView {
  const d = (typeof data === "object" && data !== null ? data : {}) as {
    generatedAt?: unknown;
    rows?: unknown;
  };
  const raw = Array.isArray(d.rows) ? d.rows.filter(isRawRow) : [];
  const hasData = raw.length > 0;

  // Run count is read from the data, not hardcoded in the caption — the desktop
  // set is a median of 5 warm runs; the old local set was 3.
  const runsRow = raw.find((r) => typeof r.runs === "number");
  const runs = runsRow && typeof runsRow.runs === "number" ? runsRow.runs : null;

  // Rank on IMAGE bytes (the deterministic metric the methodology publishes),
  // falling back to total transfer for older JSON that predates the field.
  const rowBytes = (r: RawRow) => r.imageBytes ?? r.bytes;

  const minLcp = hasData ? Math.min(...raw.map((r) => r.lcpMs)) : null;
  const maxLcp = hasData ? Math.max(...raw.map((r) => r.lcpMs)) : null;
  const minBytes = hasData ? Math.min(...raw.map(rowBytes)) : null;

  const rows: BenchmarkRowView[] = raw.map((r) => ({
    strategy: r.strategy,
    lcpMs: r.lcpMs,
    lcpMinMs: typeof r.lcpMinMs === "number" ? r.lcpMinMs : null,
    lcpMaxMs: typeof r.lcpMaxMs === "number" ? r.lcpMaxMs : null,
    cls: r.cls,
    kb: Math.round(rowBytes(r) / 1024),
    isBestLcp: r.lcpMs === minLcp,
    isWorstLcp: r.lcpMs === maxLcp,
    isBestBytes: rowBytes(r) === minBytes,
  }));

  const byStrategy = (id: string): BenchmarkRowView | undefined =>
    rows.find((r) => r.strategy === id);

  // Each finding is pushed only when every strategy it references is present,
  // and every number it carries is DERIVED from the data — no literal
  // percentages or "winner" claims that could drift when the JSON is re-measured.
  // The component (BenchmarkResults.astro) renders the prose keyed by `id`.
  // Desktop only: the findings' copy states desktop facts ("bytes wins go to
  // pixel-perfect") that INVERT on mobile, where honest sizing of the
  // full-width slot makes pixel-perfect one of the heaviest.
  const findings: Finding[] = [];
  if (mode === "desktop") {
    const pp = byStrategy("pixel-perfect");
    const fin = byStrategy("final");
    const auto = byStrategy("auto");
    const lqip = byStrategy("lqip");
    const naive = byStrategy("naive");

    const pctUnder = (baseline: number, value: number) =>
      Math.round(((baseline - value) / baseline) * 100);

    if (pp && fin && auto && naive) {
      findings.push({
        id: "bytes-winner",
        ppKb: pp.kb,
        finalKb: fin.kb,
        autoKb: auto.kb,
        pctUnderAuto: pctUnder(auto.kb, pp.kb),
        pctUnderNaive: pctUnder(naive.kb, pp.kb),
      });
    }
    if (lqip && auto) {
      findings.push({
        id: "lqip-lcp",
        lqipLcp: lqip.lcpMs,
        autoLcp: auto.lcpMs,
        deltaMs: lqip.lcpMs - auto.lcpMs,
      });
    }
    if (fin && pp) {
      findings.push({ id: "final-pick", finalKb: fin.kb, deltaMs: fin.lcpMs - pp.lcpMs });
    }
  }

  return {
    mode,
    generatedAt: typeof d.generatedAt === "string" ? d.generatedAt : null,
    runs,
    hasData,
    rows,
    findings,
  };
}

// Desktop↔mobile comparison for a chosen handful of strategies. This is the
// article's headline: the SAME strategy flips — pixel-perfect is the lightest on
// desktop (316px 3-col thumb) and among the heaviest on mobile (full-width hero),
// because the slot size, not the code, changed. Only comparing a strategy against
// ITSELF across modes is honest here — never one strategy's mode vs another's.
export type Flip = "lighter-on-mobile" | "heavier-on-mobile" | "same";

export interface BenchmarkCompareRow {
  strategy: string;
  desktopKb: number;
  mobileKb: number;
  desktopLcpMs: number;
  mobileLcpMs: number;
  flip: Flip;
}

export interface BenchmarkCompare {
  hasData: boolean;
  rows: BenchmarkCompareRow[];
}

export function compareBenchmarks(
  desktopData: unknown,
  mobileData: unknown,
  strategies: string[],
): BenchmarkCompare {
  const d = analyzeBenchmark(desktopData, "desktop");
  const m = analyzeBenchmark(mobileData, "mobile");
  const dBy = (id: string) => d.rows.find((r) => r.strategy === id);
  const mBy = (id: string) => m.rows.find((r) => r.strategy === id);

  const rows: BenchmarkCompareRow[] = [];
  for (const s of strategies) {
    const dr = dBy(s);
    const mr = mBy(s);
    if (!dr || !mr) continue; // present in BOTH modes, or the row is skipped
    rows.push({
      strategy: s,
      desktopKb: dr.kb,
      mobileKb: mr.kb,
      desktopLcpMs: dr.lcpMs,
      mobileLcpMs: mr.lcpMs,
      flip: mr.kb < dr.kb ? "lighter-on-mobile" : mr.kb > dr.kb ? "heavier-on-mobile" : "same",
    });
  }
  return { hasData: rows.length > 0, rows };
}
