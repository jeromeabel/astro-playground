import { runLighthouse } from "./lighthouse.mjs";
import { printTable, writeResults } from "./measure.mjs";

const baseUrl = process.argv[2] ?? "http://localhost:8888";
const STRATEGIES = ["naive", "manual", "auto", "pixel-perfect", "lqip", "cropped", "final"];

for (const s of STRATEGIES) {
  runLighthouse(s, baseUrl);
}
printTable();
writeResults();
