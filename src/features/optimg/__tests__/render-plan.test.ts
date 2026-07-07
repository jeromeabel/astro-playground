import { describe, it, expect } from "vitest";
import { renderPlan } from "../lib/render-plan";
import type { RenderContext } from "../lib/render-plan";
import { resolveOptions } from "../lib/strategies";
import { exact, approx } from "../lib/sizes";

const grid = (index?: number, itemCrop?: boolean): RenderContext => ({ ctx: "grid", index, itemCrop });
const cover: RenderContext = { ctx: "cover" };

describe("renderPlan — loading / fetchpriority", () => {
  it("grid index 0 is the LCP: eager + high", () => {
    const p = renderPlan(resolveOptions("auto"), grid(0));
    expect(p.loading).toBe("eager");
    expect(p.fetchpriority).toBe("high");
  });

  it("grid index 3 is above-fold but not LCP: eager + auto", () => {
    const p = renderPlan(resolveOptions("auto"), grid(3));
    expect(p.loading).toBe("eager");
    expect(p.fetchpriority).toBe("auto");
  });

  it("grid index 6 is below-fold (EAGER_AHEAD=6): lazy + auto", () => {
    const p = renderPlan(resolveOptions("auto"), grid(6));
    expect(p.loading).toBe("lazy");
    expect(p.fetchpriority).toBe("auto");
  });

  it("omitted index is safely below-fold: lazy", () => {
    expect(renderPlan(resolveOptions("auto"), grid()).loading).toBe("lazy");
  });

  it("cover is always eager + high", () => {
    const p = renderPlan(resolveOptions("auto"), cover);
    expect(p.loading).toBe("eager");
    expect(p.fetchpriority).toBe("high");
  });

  it("aboveFold:true override forces eager at index 99", () => {
    expect(renderPlan(resolveOptions("auto", { aboveFold: true }), grid(99)).loading).toBe("eager");
  });

  it("aboveFold:false override forces lazy at index 0 (fetchpriority stays high — LCP scalpel is position-based)", () => {
    const p = renderPlan(resolveOptions("auto", { aboveFold: false }), grid(0));
    expect(p.loading).toBe("lazy");
    expect(p.fetchpriority).toBe("high");
  });
});

describe("renderPlan — fade (ABOVE_FOLD_FADE = false)", () => {
  it("lqip below-fold fades", () => {
    expect(renderPlan(resolveOptions("lqip"), grid(6)).fade).toBe(true);
  });

  it("lqip at LCP index 0 never fades", () => {
    expect(renderPlan(resolveOptions("lqip"), grid(0)).fade).toBe(false);
  });

  it("lqip on cover never fades", () => {
    expect(renderPlan(resolveOptions("lqip"), cover).fade).toBe(false);
  });

  it("animation:false never fades regardless of position", () => {
    expect(renderPlan(resolveOptions("lqip", { animation: false }), grid(6)).fade).toBe(false);
  });
});

describe("renderPlan — sizes / width / widths", () => {
  it("approx grid: vw sizes, width 640, no widths", () => {
    const p = renderPlan(resolveOptions("auto"), grid(6));
    expect(p.sizes).toBe(approx.grid);
    expect(p.width).toBe(640);
    expect(p.widths).toBeUndefined();
  });

  it("approx cover: vw cover sizes, width 1280", () => {
    const p = renderPlan(resolveOptions("auto"), cover);
    expect(p.sizes).toBe(approx.cover);
    expect(p.width).toBe(1280);
  });

  it("pixel-perfect grid: exact bundle verbatim", () => {
    const p = renderPlan(resolveOptions("pixel-perfect"), grid(6));
    expect(p.sizes).toBe(exact.grid.sizes);
    expect(p.width).toBe(exact.grid.width);
    expect(p.widths).toEqual(exact.grid.widths);
  });

  it("pixel-perfect cover: exact cover bundle verbatim", () => {
    const p = renderPlan(resolveOptions("pixel-perfect"), cover);
    expect(p.sizes).toBe(exact.cover.sizes);
    expect(p.width).toBe(exact.cover.width);
    expect(p.widths).toEqual(exact.cover.widths);
  });
});

describe("renderPlan — crop", () => {
  it("cropped (coarse, not pixel-perfect) crops unconditionally: grid 4:3 → height 480", () => {
    const p = renderPlan(resolveOptions("cropped"), grid(6, undefined));
    expect(p.height).toBe(480); // 640 * 3/4
    expect(p.fit).toBe("cover");
    expect(p.position).toBeUndefined(); // cropped never sets position
    expect(p.aspect).toEqual([4, 3]);
  });

  it("cropped cover 16:9 → height 720", () => {
    const p = renderPlan(resolveOptions("cropped"), cover);
    expect(p.height).toBe(720); // 1280 * 9/16
    expect(p.aspect).toEqual([16, 9]);
  });

  it("final (pixel-perfect crop) honors the per-item opt-in: crops when itemCrop === true", () => {
    const p = renderPlan(resolveOptions("final"), grid(6, true));
    expect(p.height).toBe(Math.round((exact.grid.width * 3) / 4)); // 481 → 361
    expect(p.fit).toBe("cover");
    expect(p.position).toBe("top"); // final sets position:"top"
    expect(p.aspect).toEqual([4, 3]);
  });

  it("final does NOT crop when itemCrop is not true", () => {
    const p = renderPlan(resolveOptions("final"), grid(6, undefined));
    expect(p.height).toBeUndefined();
    expect(p.fit).toBeUndefined();
    expect(p.position).toBeUndefined();
    expect(p.aspect).toEqual([3, 2]); // natural aspect drives the LQIP
  });
});

describe("renderPlan — placeholder flags", () => {
  it("lqip preset: needsLqip, no skeleton", () => {
    const p = renderPlan(resolveOptions("lqip"), grid(6));
    expect(p.needsLqip).toBe(true);
    expect(p.showSkeleton).toBe(false);
  });

  it("skeleton placeholder: showSkeleton, no lqip", () => {
    const p = renderPlan(resolveOptions("auto", { placeholder: "skeleton" }), grid(6));
    expect(p.showSkeleton).toBe(true);
    expect(p.needsLqip).toBe(false);
  });

  it("placeholder only applies to picture sources: raw + lqip → needsLqip false", () => {
    const p = renderPlan(resolveOptions("naive", { placeholder: "lqip" }), grid(6));
    expect(p.needsLqip).toBe(false);
  });
});

describe("renderPlan — passthrough", () => {
  it("source, ctx, placeholder kind, and debug flow through", () => {
    const p = renderPlan(resolveOptions("manual", { debug: true }), grid(2));
    expect(p.source).toBe("public");
    expect(p.ctx).toBe("grid");
    expect(p.placeholder).toBe("none");
    expect(p.debug).toBe(true);
  });
});
