// Manual widths for the hand-cut public/manual/ files: the exact set
// gen-images.mjs bakes and ManualImage.astro serves via srcset. Pure,
// side-effect-free — safe to import from both the Node generator and
// Astro/TS call sites (Vite can import plain .mjs from .astro frontmatter),
// so the two sides share one array and can never drift. Same cross-runtime
// import pattern as moire.mjs.
export const MANUAL_WIDTHS = [640, 960, 1280, 1920];
