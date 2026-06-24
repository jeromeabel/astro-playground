import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURE } from "./config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(root, "scripts/lh");
const RUNS = 3; // 3-run median tames single-run noise; bump to 5 if still jumpy

export function runLighthouse(strategy, baseUrl = "http://localhost:4321") {
  mkdirSync(OUT_DIR, { recursive: true });
  const url = `${baseUrl.replace(/\/$/, "")}/${FEATURE}/${strategy}`;
  for (let run = 1; run <= RUNS; run++) {
    const out = join(OUT_DIR, `${strategy}-${run}.json`);
    console.log(`lighthouse ${strategy} run ${run}/${RUNS} -> ${url}`);
    const res = spawnSync(
      "pnpm",
      [
        "dlx",
        "lighthouse@13",
        url,
        "--preset=desktop",
        "--only-categories=performance",
        "--output=json",
        `--output-path=${out}`,
        '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
        "--quiet",
      ],
      { stdio: "inherit", cwd: root },
    );
    if (res.status !== 0) {
      throw new Error(`lighthouse failed for ${strategy} run ${run}`);
    }
  }
}

// allow `node scripts/lighthouse.mjs <strategy> [baseUrl]`
const isMain = fileURLToPath(import.meta.url) === process.argv[1];
if (isMain && process.argv[2]) runLighthouse(process.argv[2], process.argv[3]);
