import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import type { ImageMetadata } from "astro";
import { buildLqip } from "../lib/lqip";
import { renderPlan } from "../lib/render-plan";
import { resolveOptions } from "../lib/strategies";

// Same fixture as CustomImage.test.ts: fsPath points at the real committed
// source so sharp can read it.
const fakeImage = {
  src: "/src/assets/optimg/photo-01.jpg",
  width: 1280,
  height: 853,
  format: "jpg",
  fsPath: fileURLToPath(new URL("../../../assets/optimg/photo-01.jpg", import.meta.url)),
} as ImageMetadata;

describe("buildLqip", () => {
  it("returns an inline data:image/webp;base64 URI (natural 3:2)", async () => {
    const plan = renderPlan(resolveOptions("lqip"), { ctx: "grid", index: 6 });
    const uri = await buildLqip(fakeImage, plan);
    expect(uri).toMatch(/^data:image\/webp;base64,.+/);
  });

  it("cropped plan (fit:cover) still returns a data URI", async () => {
    const plan = renderPlan(resolveOptions("final"), { ctx: "grid", index: 6, itemCrop: true });
    expect(plan.fit).toBe("cover"); // precondition: this plan crops
    const uri = await buildLqip(fakeImage, plan);
    expect(uri).toMatch(/^data:image\/webp;base64,.+/);
  });

  it("crop changes the placeholder bytes (aspect actually applied)", async () => {
    const natural = renderPlan(resolveOptions("lqip"), { ctx: "grid", index: 6 });
    const cropped = renderPlan(resolveOptions("final"), { ctx: "grid", index: 6, itemCrop: true });
    const [a, b] = await Promise.all([buildLqip(fakeImage, natural), buildLqip(fakeImage, cropped)]);
    expect(a).not.toBe(b);
  });
});
