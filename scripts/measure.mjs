import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURE_DIR } from "./config.mjs";
import { median, stats, extractDpl } from "./stats.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(root, "scripts/lh");

const STRATEGIES = ["naive", "manual", "auto", "pixel-perfect", "lqip", "cropped", "final"];

// One measured Lighthouse run -> the numbers we aggregate.
// imageBytes (transferSize of resourceType Image) is the primary ranking:
// deterministic, immune to the fade and to cache-timing luck.
// dpl comes from Netlify transform URLs; null for static-only pages (naive, manual).
function runData(file) {
  const j = JSON.parse(readFileSync(file, "utf8"));
  const a = j.audits;
  const requests = a["network-requests"]?.details?.items ?? [];
  const images = requests.filter((r) => r.resourceType === "Image");
  const dpls = new Set(requests.map((r) => extractDpl(r.url)).filter(Boolean));
  return {
    lcp: a["largest-contentful-paint"].numericValue,
    cls: a["cumulative-layout-shift"].numericValue,
    bytes: a["total-byte-weight"].numericValue,
    imageBytes: images.reduce((sum, r) => sum + (r.transferSize ?? 0), 0),
    dpl: dpls.size ? [...dpls][0] : null,
  };
}

function metricsFor(strategy, mode = "mobile") {
  const dir = join(OUT_DIR, mode);
  if (!existsSync(dir)) return null;
  // \d+ only: excludes <strategy>-warmup.json by construction
  const measured = new RegExp(`^${strategy}-\\d+\\.json$`);
  const files = readdirSync(dir).filter((f) => measured.test(f));
  if (files.length === 0) return null;
  const runs = files.map((f) => runData(join(dir, f)));
  const dpls = new Set(runs.map((r) => r.dpl).filter(Boolean));
  if (dpls.size > 1) {
    throw new Error(
      `${mode}/${strategy}: runs span ${dpls.size} deploys (dpl: ${[...dpls].join(", ")}) — ` +
        `transform caches were reset mid-benchmark; re-run all runs on a single deploy`,
    );
  }
  return {
    runs: runs.length,
    lcp: stats(runs.map((r) => r.lcp)),
    cls: median(runs.map((r) => r.cls)),
    bytes: median(runs.map((r) => r.bytes)),
    imageBytes: median(runs.map((r) => r.imageBytes)),
    dpl: dpls.size ? [...dpls][0] : null,
  };
}

export function printTable(mode = "mobile") {
  const rows = STRATEGIES.map((s) => ({ s, m: metricsFor(s, mode) }));
  console.log(`\n[${mode}]`);
  console.log(
    "Strategy        Runs   LCP med (min–max) ms      CLS      Img KB   Page KB",
  );
  console.log(
    "---------------------------------------------------------------------------",
  );
  for (const { s, m } of rows) {
    if (!m) {
      console.log(`${s.padEnd(15)} (no data — run pnpm lighthouse:${s})`);
      continue;
    }
    const lcp = `${Math.round(m.lcp.median)} (${Math.round(m.lcp.min)}–${Math.round(m.lcp.max)})`;
    console.log(
      `${s.padEnd(15)} ${String(m.runs).padEnd(6)} ${lcp.padEnd(25)} ${m.cls
        .toFixed(3)
        .padEnd(8)} ${String(Math.round(m.imageBytes / 1024)).padEnd(8)} ${Math.round(m.bytes / 1024)}`,
    );
  }
  console.log("");
}

// Emit the aggregates to a committed JSON the /optimg hub renders as a table.
// One file per mode: data/benchmark.mobile.json, data/benchmark.desktop.json
// Keys lcpMs/cls/bytes are the pre-existing contract with the hub page; the
// spread, image bytes and dpl are additive.
export function writeResults(mode = "mobile") {
  const dataFile = join(root, FEATURE_DIR, `data/benchmark.${mode}.json`);
  const rows = STRATEGIES.map((s) => {
    const m = metricsFor(s, mode);
    if (!m) return null;
    return {
      strategy: s,
      runs: m.runs,
      lcpMs: Math.round(m.lcp.median),
      lcpMinMs: Math.round(m.lcp.min),
      lcpMaxMs: Math.round(m.lcp.max),
      cls: Number(m.cls.toFixed(3)),
      bytes: Math.round(m.bytes),
      imageBytes: Math.round(m.imageBytes),
      dpl: m.dpl,
    };
  }).filter(Boolean);
  const dpls = new Set(rows.map((r) => r.dpl).filter(Boolean));
  if (dpls.size > 1) {
    console.warn(
      `WARNING [${mode}]: strategies span ${dpls.size} deploys (${[...dpls].join(", ")}) — ` +
        `cross-strategy comparison is invalid; re-run the full benchmark on one deploy`,
    );
  }
  const out = { mode, generatedAt: new Date().toISOString(), rows };
  writeFileSync(dataFile, JSON.stringify(out, null, 2) + "\n");
  console.log(`wrote ${rows.length} rows -> ${FEATURE_DIR}/data/benchmark.${mode}.json`);
}

// allow `node scripts/measure.mjs [mode]`
if (process.argv[1] && process.argv[1].endsWith("measure.mjs"))
  printTable(process.argv[2]);
