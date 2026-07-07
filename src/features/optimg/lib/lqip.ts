// LQIP: build a tiny blurred placeholder at build time, matching the displayed
// aspect so it doesn't distort behind the real image. Inlined as a base64
// data: URI (not a getImage() URL) so it paints on the first frame with zero
// network requests — getImage()'s emitted asset isn't written to disk until
// Astro's post-render image-generation pass, so there's no file to read yet
// at this point in the pipeline. Instead we go straight to sharp (already a
// dependency, same library Astro's own image service uses) over the source
// file's real fs path, exposed by astro:assets as the non-enumerable
// `fsPath` on ImageMetadata (not in its public type, hence the cast).
//
// This is the ONLY fs/sharp caller in the optimg render path — keeping it out
// of render-plan.ts keeps the decision seam pure and its tests sync.
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import type { ImageMetadata } from "astro";
import type { RenderPlan } from "./render-plan";

// Longest edge (px) of the blurred placeholder baked at build time. Tiny on
// purpose: big enough to carry color/shape once blurred, small enough that the
// browser discounts it as an LCP candidate (see ABOVE_FOLD_FADE in render-plan).
const LQIP_SIZE = 32;

export async function buildLqip(image: ImageMetadata, plan: RenderPlan): Promise<string> {
  const [aw, ah] = plan.aspect;
  const cover = plan.fit === "cover";
  const fsPath = (image as unknown as { fsPath: string }).fsPath;
  const srcBuffer = await readFile(fsPath);
  const lqBuffer = await sharp(srcBuffer)
    .resize(LQIP_SIZE, Math.round((LQIP_SIZE * ah) / aw), cover ? { fit: "cover" } : undefined)
    .webp()
    .toBuffer();
  return `data:image/webp;base64,${lqBuffer.toString("base64")}`;
}
