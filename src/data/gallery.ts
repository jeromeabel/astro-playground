import data from "./gallery.json";

export interface GalleryItem {
  id: string; // "photo-01" | "art-01" ...
  kind: "photo" | "art"; // "art" => composited text + rule overlay
  source: "picsum" | "generated"; // drives gen-images.mjs branch
  alt: string;
  caption: string; // also the overlay text for kind "art"
}

export const gallery = data as unknown as GalleryItem[];
