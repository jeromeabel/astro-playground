import type { ImageMetadata } from "astro";

// Shared eager glob of the committed demo sources, used by both image routes.
// `import.meta.glob` runs at build time; `imgOf(id)` resolves a gallery id to its
// imported ImageMetadata so <Picture> can optimize it.
const images = import.meta.glob<{ default: ImageMetadata }>(
  "/src/assets/demo/*.jpg",
  { eager: true },
);

export const imgOf = (id: string): ImageMetadata | undefined =>
  images[`/src/assets/demo/${id}.jpg`]?.default;
