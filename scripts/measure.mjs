import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(root, "scripts/lh");

const STRATEGIES = ["naive", "manual", "auto", "pixel-perfect", "lqip", "cropped", "final"];

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function metricsFor(strategy) {
  if (!existsSync(OUT_DIR)) return null;
  const files = readdirSync(OUT_DIR).filter(
    (f) => f.startsWith(`${strategy}-`) && f.endsWith(".json"),
  );
  if (files.length === 0) return null;
  const lcp = [];
  const cls = [];
  const bytes = [];
  for (const f of files) {
    const j = JSON.parse(readFileSync(join(OUT_DIR, f), "utf8"));
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

export function printTable() {
  const rows = STRATEGIES.map((s) => ({ s, m: metricsFor(s) }));
  console.log("\nStrategy        Runs   LCP (ms)   CLS      Bytes (KB)");
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

const DATA_FILE = join(root, "src/features/images/data/benchmark.json");

// Emit the medians to a committed JSON the /images hub renders as a table.
export function writeResults() {
  const rows = STRATEGIES.map((s) => {
    const m = metricsFor(s);
    if (!m) return null;
    return {
      strategy: s,
      runs: m.runs,
      lcpMs: Math.round(m.lcp),
      cls: Number(m.cls.toFixed(3)),
      bytes: Math.round(m.bytes),
    };
  }).filter(Boolean);
  const out = { generatedAt: new Date().toISOString(), rows };
  writeFileSync(DATA_FILE, JSON.stringify(out, null, 2) + "\n");
  console.log(`wrote ${rows.length} rows -> src/features/images/data/benchmark.json`);
}

// allow `node scripts/measure.mjs`
if (process.argv[1] && process.argv[1].endsWith("measure.mjs")) printTable();
