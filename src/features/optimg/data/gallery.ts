import data from "./gallery.json";

export interface GalleryItem {
  id: string;
  overlay: "a" | "b" | "c" | "combo" | "d"; // baked overlay style; "d" = large bold title
  source: "picsum"; // all sources are free Picsum images
  picsumId?: number; // pin a specific curated Picsum image instead of seeding by id
  alt: string;
  caption: string; // also the baked label text for kind "art"
  crop?: boolean; // opt in to per-context crops in the "final" strategy (default off)
  author: string;
  authorUrl: string; // Unsplash photo page
}

export const gallery = data as unknown as GalleryItem[];
