import data from "./gallery.json";

export interface GalleryItem {
  id: string;
  overlay: "a" | "b" | "c" | "combo" | "d" | "e"; // baked overlay style; "d" = large bold title, "e" = two-scale moiré
  source: "unsplash";
  picsumId?: number; // unused legacy field, retained under the frozen manifest contract
  alt: string;
  caption: string; // also the baked label text for kind "art"
  crop?: boolean; // opt in to per-context crops in the "final" strategy (default off)
  author: string;
  authorUrl: string; // Unsplash photo page
}

export const gallery = data as unknown as GalleryItem[];
