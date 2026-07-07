// Benchmark view-model: raw benchmark JSON (unknown) in, a structured
// BenchmarkView out — ranked row flags plus the four narrative findings' NUMBERS.
// The hub page and <BenchmarkResults> both consume the view; neither re-derives.
// Every lookup is safe: a finding that references a missing strategy is OMITTED,
// not crashed (the old inline JSX used `.find(...)!` ~10×, each a latent build
// crash when a strategy is renamed or dropped). No prose lives here — the
// component owns the copy + <code>/<em> markup and interpolates these numbers.

export type BenchMode = "desktop" | "mobile";

export interface BenchmarkRowView {
  strategy: string;
  lcpMs: number;
  cls: number;
  kb: number;
  isBestLcp: boolean;
  isWorstLcp: boolean;
  isBestBytes: boolean;
}

export type Finding =
  | { id: "bytes-winner"; ppKb: number; finalKb: number; autoKb: number }
  | { id: "lqip-lcp"; lqipLcp: number; autoLcp: number }
  | { id: "manual-lcp"; manualLcp: number }
  | { id: "final-pick"; finalKb: number; deltaMs: number };

export interface BenchmarkView {
  mode: BenchMode;
  generatedAt: string | null;
  hasData: boolean;
  rows: BenchmarkRowView[];
  findings: Finding[];
}

interface RawRow {
  strategy: string;
  lcpMs: number;
  cls: number;
  bytes: number;
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

  const minLcp = hasData ? Math.min(...raw.map((r) => r.lcpMs)) : null;
  const maxLcp = hasData ? Math.max(...raw.map((r) => r.lcpMs)) : null;
  const minBytes = hasData ? Math.min(...raw.map((r) => r.bytes)) : null;

  const rows: BenchmarkRowView[] = raw.map((r) => ({
    strategy: r.strategy,
    lcpMs: r.lcpMs,
    cls: r.cls,
    kb: Math.round(r.bytes / 1024),
    isBestLcp: r.lcpMs === minLcp,
    isWorstLcp: r.lcpMs === maxLcp,
    isBestBytes: r.bytes === minBytes,
  }));

  const byStrategy = (id: string): BenchmarkRowView | undefined =>
    rows.find((r) => r.strategy === id);

  // Each finding is pushed only when every strategy it references is present.
  // The component (BenchmarkResults.astro) renders the prose keyed by `id`.
  const findings: Finding[] = [];
  const pp = byStrategy("pixel-perfect");
  const fin = byStrategy("final");
  const auto = byStrategy("auto");
  const lqip = byStrategy("lqip");
  const manual = byStrategy("manual");

  if (pp && fin && auto) {
    findings.push({ id: "bytes-winner", ppKb: pp.kb, finalKb: fin.kb, autoKb: auto.kb });
  }
  if (lqip && auto) {
    findings.push({ id: "lqip-lcp", lqipLcp: lqip.lcpMs, autoLcp: auto.lcpMs });
  }
  if (manual) {
    findings.push({ id: "manual-lcp", manualLcp: manual.lcpMs });
  }
  if (fin && pp) {
    findings.push({ id: "final-pick", finalKb: fin.kb, deltaMs: fin.lcpMs - pp.lcpMs });
  }

  return {
    mode,
    generatedAt: typeof d.generatedAt === "string" ? d.generatedAt : null,
    hasData,
    rows,
    findings,
  };
}
