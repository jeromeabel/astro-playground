// One-time populator for src/assets/optimg/original/<id>.jpg — the committed,
// un-optimized raw source per gallery item. NOT wired into prebuild/gen:optimg;
// run manually via `pnpm fetch:originals` and commit the result.
//
// Source: Unsplash direct via the Unsplash API. gallery.json's existing
// `authorUrl` (format https://unsplash.com/photos/<photoId>) already gives us
// the per-item Unsplash photo id — no search/matching needed.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURE_DIR } from "./config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGINAL_DIR = join(root, "src/assets/optimg/original");

const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
if (!ACCESS_KEY) {
  console.error(
    "UNSPLASH_ACCESS_KEY is not set. Export it in your shell before running `pnpm fetch:originals`.",
  );
  process.exit(1);
}

const gallery = JSON.parse(
  await readFile(join(root, FEATURE_DIR, "data/gallery.json"), "utf8"),
);

// FORCE env: override the no-overwrite guard for specific or all ids.
//   FORCE=all                → re-fetch every original
//   FORCE=photo-04,photo-05  → re-fetch only those ids
//   FORCE unset               → refuse to overwrite an existing original
const validIds = new Set(gallery.map((item) => item.id));
const forceRaw = process.env.FORCE;
let forceAll = false;
const forceIds = new Set();
if (forceRaw) {
  if (forceRaw === "all") {
    forceAll = true;
  } else {
    for (const id of forceRaw.split(",").map((s) => s.trim())) {
      if (!validIds.has(id)) {
        console.error(`FORCE: unknown id "${id}". Valid ids: ${[...validIds].join(", ")}`);
        process.exit(1);
      }
      forceIds.add(id);
    }
  }
}

function photoIdFromAuthorUrl(authorUrl) {
  // https://unsplash.com/photos/<photoId> — last path segment is the id.
  const match = /\/photos\/([^/?#]+)/.exec(authorUrl || "");
  if (!match) {
    throw new Error(`cannot extract Unsplash photo id from authorUrl "${authorUrl}"`);
  }
  return match[1];
}

async function fetchPhotoMeta(photoId) {
  const res = await fetch(
    `https://api.unsplash.com/photos/${photoId}?client_id=${ACCESS_KEY}`,
  );
  if (!res.ok) {
    throw new Error(`Unsplash photo lookup for ${photoId} failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  const downloadUrl = json?.urls?.raw || json?.urls?.full;
  if (!downloadUrl) {
    throw new Error(`Unsplash photo ${photoId} response had no urls.raw/urls.full`);
  }
  return { downloadUrl, downloadLocation: json?.links?.download_location };
}

// Unsplash API guidelines: trigger download-tracking once per photo use.
// Fire-and-forget — never block or fail the fetch on this call's outcome.
async function trackDownload(photoId, downloadLocation) {
  const url = downloadLocation
    ? `${downloadLocation}${downloadLocation.includes("?") ? "&" : "?"}client_id=${ACCESS_KEY}`
    : `https://api.unsplash.com/photos/${photoId}/download_location?client_id=${ACCESS_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  ⚠ ${photoId}: download-tracking call failed: ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    console.warn(`  ⚠ ${photoId}: download-tracking call errored: ${err.message}`);
  }
}

async function fetchOriginal(item) {
  const out = join(ORIGINAL_DIR, `${item.id}.jpg`);
  const photoId = photoIdFromAuthorUrl(item.authorUrl);

  const { downloadUrl, downloadLocation } = await fetchPhotoMeta(photoId);

  const res = await fetch(downloadUrl);
  if (!res.ok) {
    throw new Error(`Unsplash image download for ${item.id} (${photoId}) failed: ${res.status} ${res.statusText}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(out, buffer);

  await trackDownload(photoId, downloadLocation);
}

await mkdir(ORIGINAL_DIR, { recursive: true });

for (const item of gallery) {
  const out = join(ORIGINAL_DIR, `${item.id}.jpg`);
  const force = forceAll || forceIds.has(item.id);
  if (!force && existsSync(out)) {
    console.log(`- ${item.id}: already present, skipping (set FORCE=${item.id} or FORCE=all to re-fetch)`);
    continue;
  }
  try {
    await fetchOriginal(item);
    console.log(`✓ ${item.id}`);
  } catch (err) {
    // Don't let one bad id (e.g. a since-deleted Unsplash photo) abort the run —
    // keep fetching the rest, then fail loud on the full set of gaps below.
    console.error(`✗ ${item.id}: ${err.message}`);
  }
}

// Fail loud on any gap: every gallery id must have resolved to a committed file.
const missing = gallery.filter((item) => !existsSync(join(ORIGINAL_DIR, `${item.id}.jpg`)));
if (missing.length > 0) {
  console.error(
    `\nMissing originals for: ${missing.map((item) => item.id).join(", ")}`,
  );
  process.exit(1);
}

console.log(`\nAll ${gallery.length} originals present -> src/assets/optimg/original`);
