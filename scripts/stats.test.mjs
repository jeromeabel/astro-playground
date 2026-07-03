import { describe, it, expect } from "vitest";
import { median, stats, extractDpl } from "./stats.mjs";

describe("median", () => {
  it("returns the middle value for odd-length input", () => {
    expect(median([5, 1, 3])).toBe(3);
  });
  it("averages the two middle values for even-length input", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it("does not mutate its input", () => {
    const input = [3, 1, 2];
    median(input);
    expect(input).toEqual([3, 1, 2]);
  });
});

describe("stats", () => {
  it("returns min, median, max", () => {
    expect(stats([5970, 4433, 2192, 2204, 2190])).toEqual({
      min: 2190,
      median: 2204,
      max: 5970,
    });
  });
});

describe("extractDpl", () => {
  it("extracts dpl from a Netlify transform URL", () => {
    const url =
      "https://astro-jeromeabel.netlify.app/.netlify/images?url=_astro%2Fphoto-01.DLKF_oli.jpg&fm=avif&w=962&h=642&fit=cover&dpl=6a4445c3bb9f5c000844e0c";
    expect(extractDpl(url)).toBe("6a4445c3bb9f5c000844e0c");
  });
  it("returns null for static asset URLs (naive/manual have no transform)", () => {
    expect(
      extractDpl("https://astro-jeromeabel.netlify.app/_astro/photo-01.DLKF_oli.jpg"),
    ).toBeNull();
  });
  it("returns null for non-URL garbage", () => {
    expect(extractDpl("")).toBeNull();
  });
});
