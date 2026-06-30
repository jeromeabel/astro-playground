import { runLighthouse } from "./lighthouse.mjs";
import { printTable, writeResults } from "./measure.mjs";

// usage: node scripts/benchmark.mjs [baseUrl] [mode]
//   mode = "mobile" (default) | "desktop"
const baseUrl = process.argv[2] ?? "http://localhost:8888";
const mode = process.argv[3] ?? "mobile";
const STRATEGIES = ["naive", "manual", "auto", "pixel-perfect", "lqip", "cropped", "final"];

for (const s of STRATEGIES) {
  runLighthouse(s, baseUrl, mode);
}
printTable(mode);
writeResults(mode);
