import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURE_DIR } from "./config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(root, "scripts/lh");

const STRATEGIES = ["naive", "manual", "auto", "pixel-perfect", "lqip", "cropped", "final"];

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function metricsFor(strategy, mode = "mobile") {
  const dir = join(OUT_DIR, mode);
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter(
    (f) => f.startsWith(`${strategy}-`) && f.endsWith(".json"),
  );
  if (files.length === 0) return null;
  const lcp = [];
  const cls = [];
  const bytes = [];
  for (const f of files) {
    const j = JSON.parse(readFileSync(join(dir, f), "utf8"));
    const a = j.audits;
    lcp.push(a["largest-contentful-paint"].numericValue);
    cls.push(a["cumulative-layout-shift"].numericValue);
    bytes.push(a["total-byte-weight"].numericValue);
  }
  return {
    runs: files.length,
    lcp: median(lcp),
    cls: median(cls),
    bytes: median(bytes),
  };
}

export function printTable(mode = "mobile") {
  const rows = STRATEGIES.map((s) => ({ s, m: metricsFor(s, mode) }));
  console.log(`\n[${mode}]`);
  console.log("Strategy        Runs   LCP (ms)   CLS      Bytes (KB)");
  console.log("------------------------------------------------------");
  for (const { s, m } of rows) {
    if (!m) {
      console.log(`${s.padEnd(15)} (no data — run pnpm lighthouse:${s})`);
      continue;
    }
    console.log(
      `${s.padEnd(15)} ${String(m.runs).padEnd(6)} ${Math.round(m.lcp)
        .toString()
        .padEnd(10)} ${m.cls.toFixed(3).padEnd(8)} ${Math.round(m.bytes / 1024)}`,
    );
  }
  console.log("");
}

// Emit the medians to a committed JSON the /images hub renders as a table.
// One file per mode: data/benchmark.mobile.json, data/benchmark.desktop.json
export function writeResults(mode = "mobile") {
  const dataFile = join(root, FEATURE_DIR, `data/benchmark.${mode}.json`);
  const rows = STRATEGIES.map((s) => {
    const m = metricsFor(s, mode);
    if (!m) return null;
    return {
      strategy: s,
      runs: m.runs,
      lcpMs: Math.round(m.lcp),
      cls: Number(m.cls.toFixed(3)),
      bytes: Math.round(m.bytes),
    };
  }).filter(Boolean);
  const out = { mode, generatedAt: new Date().toISOString(), rows };
  writeFileSync(dataFile, JSON.stringify(out, null, 2) + "\n");
  console.log(`wrote ${rows.length} rows -> ${FEATURE_DIR}/data/benchmark.${mode}.json`);
}

// allow `node scripts/measure.mjs [mode]`
if (process.argv[1] && process.argv[1].endsWith("measure.mjs"))
  printTable(process.argv[2]);
