import data from "./gallery.json";

export interface GalleryItem {
  id: string; // "photo-01" | "art-01" ...
  kind: "photo" | "art"; // "art" => baked hard-edged text label
  source: "picsum"; // all sources are free Picsum images
  alt: string;
  caption: string; // also the baked label text for kind "art"
}

export const gallery = data as unknown as GalleryItem[];
