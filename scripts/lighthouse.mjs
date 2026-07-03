import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURE } from "./config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(root, "scripts/lh");
const RUNS = 5; // 5-run median tames single-run noise
const WARMUP_RUNS = 1; // discarded — primes the CDN edge + transform cache for THIS mode's variants

// mode: "mobile" (Lighthouse default — Moto G Power, Slow 4G, CPU ×4)
//       "desktop" (--preset=desktop — CPU ×1, 10 Mbps)
export function runLighthouse(strategy, baseUrl = "http://localhost:4321", mode = "mobile") {
  const outDir = join(OUT_DIR, mode);
  mkdirSync(outDir, { recursive: true });
  const url = `${baseUrl.replace(/\/$/, "")}/${FEATURE}/${strategy}`;
  for (let run = 1 - WARMUP_RUNS; run <= RUNS; run++) {
    const isWarmup = run < 1;
    const out = join(
      outDir,
      isWarmup ? `${strategy}-warmup.json` : `${strategy}-${run}.json`,
    );
    console.log(
      isWarmup
        ? `lighthouse ${mode} ${strategy} warmup (discarded) -> ${url}`
        : `lighthouse ${mode} ${strategy} run ${run}/${RUNS} -> ${url}`,
    );
    const args = [
      "dlx",
      "lighthouse@13",
      url,
      "--only-categories=performance",
      "--output=json",
      `--output-path=${out}`,
      "--chrome-flags=--headless=new --no-sandbox --disable-gpu",
      "--quiet",
    ];
    if (mode === "desktop") args.splice(3, 0, "--preset=desktop");
    // Lantern's simulated-throttling LCP is a trace extrapolation, not a direct
    // measurement — it nonlinearly amplifies real scheduling jitter for
    // strategies with longer critical-path chains (e.g. an extra Netlify Image
    // transform hop), producing a bimodal spread unrelated to actual performance.
    // devtools throttling paces the real network/CPU instead of simulating it.
    if (mode === "mobile") args.splice(3, 0, "--throttling-method=devtools");
    const res = spawnSync("pnpm", args, { stdio: "inherit", cwd: root });
    if (res.status !== 0) {
      throw new Error(`lighthouse failed for ${mode} ${strategy} run ${run}`);
    }
  }
}

// allow `node scripts/lighthouse.mjs <strategy> [baseUrl] [mode]`
const isMain = fileURLToPath(import.meta.url) === process.argv[1];
if (isMain && process.argv[2])
  runLighthouse(process.argv[2], process.argv[3], process.argv[4]);
