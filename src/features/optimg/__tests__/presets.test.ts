import { describe, it, expect } from "vitest";
import { STRATEGY_PRESETS, resolveOptions } from "../lib/presets";
import { STRATEGY_IDS } from "../lib/strategies";

describe("STRATEGY_PRESETS", () => {
  it("covers every strategy id exactly once", () => {
    expect(Object.keys(STRATEGY_PRESETS).sort()).toEqual([...STRATEGY_IDS].sort());
  });

  it("naive is a raw bare <img> with no enhancements", () => {
    expect(STRATEGY_PRESETS.naive).toMatchObject({
      source: "raw", placeholder: "none", animation: false, pixelPerfect: false, crop: false,
    });
  });

  it("manual is the public /manual path, no Picture", () => {
    expect(STRATEGY_PRESETS.manual.source).toBe("public");
  });

  it("auto is a plain picture: no placeholder, no pp, no crop", () => {
    expect(STRATEGY_PRESETS.auto).toMatchObject({
      source: "picture", placeholder: "none", animation: false, pixelPerfect: false, crop: false,
    });
  });

  it("pixel-perfect toggles ONLY pixelPerfect on top of auto", () => {
    expect(STRATEGY_PRESETS["pixel-perfect"]).toMatchObject({
      source: "picture", pixelPerfect: true, placeholder: "none", animation: false, crop: false,
    });
  });

  it("lqip = auto + inlined placeholder + fade", () => {
    expect(STRATEGY_PRESETS.lqip).toMatchObject({
      source: "picture", placeholder: "lqip", animation: true, pixelPerfect: false, crop: false,
    });
  });

  it("cropped = auto + crop (coarse, not pixel-perfect)", () => {
    expect(STRATEGY_PRESETS.cropped).toMatchObject({
      source: "picture", crop: true, pixelPerfect: false, placeholder: "none", animation: false,
    });
  });

  it("final = lqip + pixelPerfect + crop (the union)", () => {
    expect(STRATEGY_PRESETS.final).toMatchObject({
      source: "picture", placeholder: "lqip", animation: true, pixelPerfect: true, crop: true,
    });
  });

  it("no preset enables debug (it is a runtime toggle, not a strategy trait)", () => {
    for (const s of STRATEGY_IDS) expect(STRATEGY_PRESETS[s].debug).toBe(false);
  });
});

describe("resolveOptions", () => {
  it("returns the preset unchanged with no overrides", () => {
    expect(resolveOptions("auto")).toEqual(STRATEGY_PRESETS.auto);
  });
  it("merges overrides for intermediate configs (auto + pixelPerfect)", () => {
    expect(resolveOptions("auto", { pixelPerfect: true })).toMatchObject({
      source: "picture", pixelPerfect: true, placeholder: "none",
    });
  });
  it("does not mutate the preset", () => {
    resolveOptions("auto", { pixelPerfect: true });
    expect(STRATEGY_PRESETS.auto.pixelPerfect).toBe(false);
  });
});
