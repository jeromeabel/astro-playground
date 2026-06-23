# Backup — procedural-image generator

`gen-images-generated.mjs` is the pre-2026-06-23 generator. It produced half the
dataset procedurally (`sharp` + `feTurbulence` plasma, fixed seed) instead of
from Picsum. The current dataset is all-free (Picsum only); this is kept "in
case." It is deterministic (fixed seed → byte-identical output), so the script
*is* the backup of those images — no binaries are stored here.

To regenerate the old mixed dataset: restore the `source: "generated"` entries
in `src/data/gallery.json`, then run `node scripts/backup/gen-images-generated.mjs`.
