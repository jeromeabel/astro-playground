import data from "./gallery.json";

export interface GalleryItem {
  id: string; // "photo-01" | "art-01" ...
  kind: "photo" | "art"; // "art" => baked hard-edged text label
  overlay?: "a" | "b" | "c" | "combo"; // per-art resampling-demo style (default: env OVERLAY)
  source: "picsum"; // all sources are free Picsum images
  picsumId?: number; // pin a specific curated Picsum image instead of seeding by id
  alt: string;
  caption: string; // also the baked label text for kind "art"
  crop?: boolean; // opt in to per-context crops in the "final" strategy (default off)
  author: string;
  authorUrl: string; // Unsplash photo page
}

export const gallery = data as unknown as GalleryItem[];
