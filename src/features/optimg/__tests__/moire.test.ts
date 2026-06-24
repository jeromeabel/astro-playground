import { describe, it, expect } from "vitest";
import { p0, MOIRE_SLOTS } from "../../../../scripts/moire.mjs";
import { slots } from "../lib/sizes";

describe("moiré math", () => {
  it("p0(316) === 38", () => {
    expect(p0(316)).toBe(38);
  });

  it("p0(976) === 12", () => {
    expect(p0(976)).toBe(12);
  });
});

describe("MOIRE_SLOTS contract — generator constants match sizes.ts SSOT", () => {
  it("grid slot matches slots.lg", () => {
    expect(MOIRE_SLOTS.grid).toBe(slots.lg);
  });

  it("cover slot matches slots.cover", () => {
    expect(MOIRE_SLOTS.cover).toBe(slots.cover);
  });
});
