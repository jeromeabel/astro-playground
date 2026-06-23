import data from "./gallery.json";

export interface GalleryItem {
  id: string; // "photo-01" | "art-01" ...
  kind: "photo" | "art"; // "art" => baked hard-edged text label
  source: "picsum"; // all sources are free Picsum images
  picsumId?: number; // pin a specific curated Picsum image instead of seeding by id
  alt: string;
  caption: string; // also the baked label text for kind "art"
  author: string;
  authorUrl: string; // Unsplash photo page
}

export const gallery = data as unknown as GalleryItem[];
