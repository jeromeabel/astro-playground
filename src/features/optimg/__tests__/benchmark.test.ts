import { describe, it, expect } from "vitest";
import { analyzeBenchmark, compareBenchmarks } from "@optimg/lib/benchmark";

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
  it("maps every row with rounded KB and reads the run count from the data", () => {
    const view = analyzeBenchmark(FULL, "desktop");
    expect(view.hasData).toBe(true);
    expect(view.mode).toBe("desktop");
    expect(view.generatedAt).toBe("2026-07-04T00:04:39.500Z");
    expect(view.runs).toBe(5);
    expect(view.rows).toHaveLength(7);
    // kb comes from imageBytes (bytes - 10_000 in the fixture), not total bytes
    expect(view.rows[0]).toMatchObject({ strategy: "naive", lcpMs: 526, kb: 9126 });
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
  it("emits the three data-backed findings in order when every referenced strategy is present", () => {
    const view = analyzeBenchmark(FULL, "desktop");
    expect(view.findings.map((f) => f.id)).toEqual([
      "bytes-winner", "lqip-lcp", "final-pick",
    ]);
  });

  it("derives percentages and LCP deltas from the data — never literals", () => {
    const view = analyzeBenchmark(FULL, "desktop");
    // KB from imageBytes: round(270000/1024)=264, round(275000/1024)=269,
    // round(610000/1024)=596, round(9345024/1024)=9126.
    // pctUnderAuto=round((596-264)/596*100)=56,
    // pctUnderNaive=round((9126-264)/9126*100)=97.
    expect(view.findings).toContainEqual({
      id: "bytes-winner", ppKb: 264, finalKb: 269, autoKb: 596,
      pctUnderAuto: 56, pctUnderNaive: 97,
    });
    // lqip delta = lqip.lcpMs - auto.lcpMs = 900 - 690 = 210
    expect(view.findings).toContainEqual({
      id: "lqip-lcp", lqipLcp: 900, autoLcp: 690, deltaMs: 210,
    });
    // delta = final.lcpMs - pp.lcpMs = 720 - 640 = 80
    expect(view.findings).toContainEqual({ id: "final-pick", finalKb: 269, deltaMs: 80 });
  });

  it("omits a finding when a strategy it needs is missing — no throw", () => {
    const noLqip = { ...FULL, rows: FULL.rows.filter((r) => r.strategy !== "lqip") };
    const view = analyzeBenchmark(noLqip, "desktop");
    expect(view.hasData).toBe(true);
    expect(view.findings.map((f) => f.id)).toEqual(["bytes-winner", "final-pick"]);
  });

  it("drops bytes-winner when its naive baseline is missing — no throw", () => {
    const noNaive = { ...FULL, rows: FULL.rows.filter((r) => r.strategy !== "naive") };
    const view = analyzeBenchmark(noNaive, "desktop");
    // bytes-winner needs naive for pctUnderNaive → gone; the rest survive
    expect(view.findings.map((f) => f.id)).toEqual(["lqip-lcp", "final-pick"]);
  });

  it("drops every finding that references a renamed strategy — still no throw", () => {
    const renamed = {
      ...FULL,
      rows: FULL.rows.map((r) => (r.strategy === "final" ? { ...r, strategy: "prod" } : r)),
    };
    const view = analyzeBenchmark(renamed, "desktop");
    // bytes-winner needs final, final-pick needs final → both gone
    expect(view.findings.map((f) => f.id)).toEqual(["lqip-lcp"]);
  });
});

describe("compareBenchmarks — desktop↔mobile", () => {
  // Mobile mirrors the real inversion: pixel-perfect balloons (small desktop
  // thumb → full-width mobile hero), auto shrinks (its generic sizes under-sizes
  // the big slot). Same row helper, flipped bytes.
  const MOBILE = {
    mode: "mobile",
    generatedAt: "2026-07-03T23:55:58.998Z",
    rows: [
      row("auto", 3794, 610_000),
      row("pixel-perfect", 4494, 960_000),
      row("final", 4514, 965_000),
    ],
  };

  it("emits one row per requested strategy present in BOTH modes, in order", () => {
    const c = compareBenchmarks(FULL, MOBILE, ["auto", "pixel-perfect", "final"]);
    expect(c.hasData).toBe(true);
    expect(c.rows.map((r) => r.strategy)).toEqual(["auto", "pixel-perfect", "final"]);
  });

  it("carries both modes' KB + LCP and flags the flip direction", () => {
    const c = compareBenchmarks(FULL, MOBILE, ["auto", "pixel-perfect"]);
    // auto (imageBytes): desktop round(610000/1024)=596, mobile round(600000/1024)=586 → lighter
    expect(c.rows[0]).toMatchObject({
      strategy: "auto", desktopKb: 596, mobileKb: 586,
      desktopLcpMs: 690, mobileLcpMs: 3794, flip: "lighter-on-mobile",
    });
    // pixel-perfect: desktop 264, mobile round(950000/1024)=928 → heavier
    expect(c.rows[1]).toMatchObject({
      strategy: "pixel-perfect", desktopKb: 264, mobileKb: 928, flip: "heavier-on-mobile",
    });
  });

  it("skips a strategy missing from either mode — never throws", () => {
    const c = compareBenchmarks(FULL, MOBILE, ["auto", "cropped", "ghost"]);
    // cropped exists on desktop only, ghost nowhere → both skipped
    expect(c.rows.map((r) => r.strategy)).toEqual(["auto"]);
  });

  it("no overlap → hasData:false, empty rows", () => {
    const c = compareBenchmarks(FULL, { rows: [] }, ["auto", "pixel-perfect"]);
    expect(c.hasData).toBe(false);
    expect(c.rows).toEqual([]);
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
