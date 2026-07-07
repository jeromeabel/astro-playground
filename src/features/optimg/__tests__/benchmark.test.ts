import { describe, it, expect } from "vitest";
import { analyzeBenchmark } from "../lib/benchmark";

// Shape mirrors data/benchmark.desktop.json (extra fields like runs/dpl must
// be tolerated and ignored).
const row = (strategy: string, lcpMs: number, bytes: number, cls = 0.004) => ({
  strategy, runs: 5, lcpMs, lcpMinMs: lcpMs - 10, lcpMaxMs: lcpMs + 10, cls, bytes,
  imageBytes: bytes - 10_000, dpl: "abc123",
});

const FULL = {
  mode: "desktop",
  generatedAt: "2026-07-04T00:04:39.500Z",
  rows: [
    row("naive", 526, 9_355_024),
    row("manual", 555, 800_000),
    row("auto", 690, 620_000),
    row("pixel-perfect", 640, 280_000),
    row("lqip", 900, 630_000),
    row("cropped", 700, 500_000),
    row("final", 720, 285_000),
  ],
};

describe("analyzeBenchmark — rows", () => {
  it("maps every row with rounded KB", () => {
    const view = analyzeBenchmark(FULL, "desktop");
    expect(view.hasData).toBe(true);
    expect(view.mode).toBe("desktop");
    expect(view.generatedAt).toBe("2026-07-04T00:04:39.500Z");
    expect(view.rows).toHaveLength(7);
    expect(view.rows[0]).toMatchObject({ strategy: "naive", lcpMs: 526, kb: 9136 });
  });

  it("flags best/worst LCP and best bytes", () => {
    const view = analyzeBenchmark(FULL, "desktop");
    const by = (id: string) => view.rows.find((r) => r.strategy === id)!;
    expect(by("naive").isBestLcp).toBe(true);   // 526 is min
    expect(by("lqip").isWorstLcp).toBe(true);   // 900 is max
    expect(by("pixel-perfect").isBestBytes).toBe(true); // 280_000 is min
    expect(by("auto")).toMatchObject({ isBestLcp: false, isWorstLcp: false, isBestBytes: false });
  });
});

describe("analyzeBenchmark — findings", () => {
  it("emits all four findings in order when every referenced strategy is present", () => {
    const view = analyzeBenchmark(FULL, "desktop");
    expect(view.findings.map((f) => f.id)).toEqual([
      "bytes-winner", "lqip-lcp", "manual-lcp", "final-pick",
    ]);
  });

  it("carries the measured numbers on each finding (round(bytes/1024), lcp delta)", () => {
    const view = analyzeBenchmark(FULL, "desktop");
    // round(280000/1024)=273, round(285000/1024)=278, round(620000/1024)=605
    expect(view.findings).toContainEqual({
      id: "bytes-winner", ppKb: 273, finalKb: 278, autoKb: 605,
    });
    expect(view.findings).toContainEqual({ id: "lqip-lcp", lqipLcp: 900, autoLcp: 690 });
    expect(view.findings).toContainEqual({ id: "manual-lcp", manualLcp: 555 });
    // delta = final.lcpMs - pp.lcpMs = 720 - 640 = 80
    expect(view.findings).toContainEqual({ id: "final-pick", finalKb: 278, deltaMs: 80 });
  });

  it("omits a finding when a strategy it needs is missing — no throw", () => {
    const noLqip = { ...FULL, rows: FULL.rows.filter((r) => r.strategy !== "lqip") };
    const view = analyzeBenchmark(noLqip, "desktop");
    expect(view.hasData).toBe(true);
    expect(view.findings.map((f) => f.id)).toEqual([
      "bytes-winner", "manual-lcp", "final-pick",
    ]);
  });

  it("drops every finding that references a renamed strategy — still no throw", () => {
    const renamed = {
      ...FULL,
      rows: FULL.rows.map((r) => (r.strategy === "final" ? { ...r, strategy: "prod" } : r)),
    };
    const view = analyzeBenchmark(renamed, "desktop");
    // bytes-winner needs final, final-pick needs final → both gone
    expect(view.findings.map((f) => f.id)).toEqual(["lqip-lcp", "manual-lcp"]);
  });
});

describe("analyzeBenchmark — degenerate input", () => {
  it("empty rows → hasData:false, findings:[]", () => {
    const view = analyzeBenchmark({ generatedAt: null, rows: [] }, "desktop");
    expect(view.hasData).toBe(false);
    expect(view.rows).toEqual([]);
    expect(view.findings).toEqual([]);
  });

  it("null / missing rows / garbage entries → hasData:false or filtered, never throws", () => {
    expect(analyzeBenchmark(null, "desktop").hasData).toBe(false);
    expect(analyzeBenchmark({}, "mobile").hasData).toBe(false);
    const view = analyzeBenchmark({ rows: [{ strategy: "auto" }, "junk", null] }, "desktop");
    expect(view.hasData).toBe(false); // no entry has the full numeric shape
  });
});
